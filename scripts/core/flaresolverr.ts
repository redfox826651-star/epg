import axios, { AxiosInstance } from 'axios'
import crypto from 'crypto'
import { parseProxy } from './utils'

// Markers that identify a Cloudflare interstitial / challenge page rather than real content.
const CHALLENGE_MARKERS = [
  'Just a moment',
  'challenge-platform',
  '__cf_chl',
  'cf_chl_opt',
  '_cf_chl_',
  'cf-chl-bypass',
  'Enable JavaScript and cookies to continue',
  'Attention Required! | Cloudflare',
  'cf-error-details',
  'DDoS protection by Cloudflare'
]

// Statuses Cloudflare uses when blocking / challenging.
const BLOCKED_STATUSES = [403, 429, 503, 520, 521, 522, 523, 524, 525, 526]

/**
 * Heuristic: does this axios response look like a Cloudflare challenge/block
 * rather than the real page? Kept conservative to avoid false positives on
 * sites that merely sit behind Cloudflare's CDN but answer normally.
 */
export function looksLikeCloudflareChallenge(response: any): boolean {
  if (!response) return false

  const status = response.status
  const headers = response.headers || {}
  const server = String(headers['server'] || headers['Server'] || '').toLowerCase()
  const cfMitigated = String(headers['cf-mitigated'] || headers['Cf-Mitigated'] || '').toLowerCase()

  let body = ''
  try {
    body = response.data ? response.data.toString() : ''
  } catch {
    body = ''
  }

  const hasMarker = CHALLENGE_MARKERS.some(m => body.includes(m))

  if (cfMitigated === 'challenge') return true
  if (hasMarker) return true
  if (BLOCKED_STATUSES.includes(status) && server.includes('cloudflare')) return true

  return false
}

// Convert the grabber's proxy string (e.g. socks5://user:pass@host:port) into the
// shape FlareSolverr expects. Chrome (which FlareSolverr drives) cannot use
// authenticated SOCKS5, so we always hand it an HTTP proxy with separate creds.
// Residential gateways such as iproyal accept HTTP on the same port.
//
// When sticky is enabled (default) an iproyal-style "_session-/_lifetime-" token
// is appended so every request in a grab shares ONE exit IP. That keeps the
// cf_clearance cookie valid across channels, so within a reused FlareSolverr
// session only the FIRST challenged request actually solves; the rest are ~instant.
// Disable with FLARESOLVERR_STICKY=0 for non-iproyal proxies.
function buildFsProxy(proxyString: string | undefined, stickyToken: string): any {
  if (!proxyString) return undefined

  try {
    const p: any = parseProxy(proxyString)
    const fsProxy: any = { url: `http://${p.host}:${p.port}` }

    if (p.auth && (p.auth.username || p.auth.password)) {
      let password = p.auth.password || ''
      const sticky = process.env.FLARESOLVERR_STICKY
      const stickyEnabled =
        sticky === undefined ? true : !['0', 'false', 'no'].includes(sticky.toLowerCase())

      if (stickyEnabled && !/_session-/.test(password)) {
        const lifetime = process.env.FLARESOLVERR_STICKY_LIFETIME || '30m'
        password = `${password}_session-${stickyToken}_lifetime-${lifetime}`
      }

      fsProxy.username = p.auth.username
      fsProxy.password = password
    }

    return fsProxy
  } catch {
    return undefined
  }
}

// Minimal HTML entity decoder (enough for JSON payloads). &amp; is decoded last
// so we never double-decode.
function htmlDecode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
}

// FlareSolverr drives a real Chrome, so a JSON API endpoint comes back rendered
// as HTML: `<html>...<body><pre>{...json...}</pre></body></html>`. Parsers that
// expect raw JSON then choke and silently return nothing. If the response is
// that JSON-viewer wrapper, return the raw JSON text; otherwise return null so
// genuinely-HTML sites are left untouched.
function unwrapJsonViewer(body: string): string | null {
  const m = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(body)
  if (!m) return null

  const trimmed = htmlDecode(m[1]).trim()
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return null

  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {
    return null
  }
}

// Track live sessions so they can be torn down on process exit.
const liveSessions: Array<{ endpoint: string; sessionId: string }> = []

export async function destroyFlareSolverrSessions(): Promise<void> {
  const plain = axios.create()
  while (liveSessions.length) {
    const { endpoint, sessionId } = liveSessions.pop() as { endpoint: string; sessionId: string }
    try {
      await plain.post(
        endpoint,
        { cmd: 'sessions.destroy', session: sessionId },
        { proxy: false, timeout: 30000 }
      )
    } catch {
      /* best effort */
    }
  }
}

let cleanupRegistered = false
function registerCleanup(): void {
  if (cleanupRegistered) return
  cleanupRegistered = true
  process.once('beforeExit', () => {
    void destroyFlareSolverrSessions()
  })
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, async () => {
      await destroyFlareSolverrSessions()
      process.exit(0)
    })
  }
}

interface FallbackOptions {
  proxy?: string
  logger?: any
  endpoint?: string
  maxTimeout?: number
}

/**
 * Install a response interceptor that transparently retries any request which
 * hit a Cloudflare challenge through FlareSolverr. Works for both non-2xx
 * challenges (rejected by axios) and 200 interstitials (fulfilled).
 *
 * A single FlareSolverr session is created lazily on the first challenge and
 * reused for every subsequent request, so the expensive browser solve happens
 * once per grab instead of once per channel.
 */
export function attachFlareSolverrFallback(instance: AxiosInstance, opts: FallbackOptions): void {
  const endpoint = opts.endpoint || process.env.FLARESOLVERR_URL || 'http://127.0.0.1:8191/v1'
  const maxTimeout = opts.maxTimeout || parseInt(process.env.FLARESOLVERR_MAX_TIMEOUT || '60000', 10)
  const stickyToken = crypto.randomBytes(6).toString('hex')
  const fsProxy = buildFsProxy(opts.proxy, stickyToken)
  const sessionId = `epg-${process.pid}-${stickyToken}`

  // Fresh axios instance: no global SOCKS agent, so the localhost calls to
  // FlareSolverr go direct instead of being tunneled through the proxy.
  const plain = axios.create()

  const log = (m: string) => {
    if (opts.logger && typeof opts.logger.info === 'function') opts.logger.info(m)
    else console.log(m)
  }

  // Lazily create (once) the reusable FlareSolverr session. Resolves to true if
  // the session is usable, false if we should fall back to stateless solving.
  let sessionPromise: Promise<boolean> | null = null
  const ensureSession = (): Promise<boolean> => {
    if (!sessionPromise) {
      sessionPromise = (async () => {
        try {
          const body: any = { cmd: 'sessions.create', session: sessionId }
          if (fsProxy) body.proxy = fsProxy
          const r = await plain.post(endpoint, body, { proxy: false, timeout: 60000 })
          if (r.data && r.data.status === 'ok') {
            liveSessions.push({ endpoint, sessionId })
            registerCleanup()
            log(`  [flaresolverr] session ${sessionId} created`)
            return true
          }
          log(`  [flaresolverr] could not create session, using stateless mode`)
          return false
        } catch (e: any) {
          log(`  [flaresolverr] session create failed (${e.message}), using stateless mode`)
          return false
        }
      })()
    }
    return sessionPromise
  }

  const solve = async (originalConfig: any): Promise<any> => {
    const targetUrl = originalConfig.url
    const method = String(originalConfig.method || 'get').toLowerCase()
    const cmd = method === 'post' ? 'request.post' : 'request.get'
    const haveSession = await ensureSession()

    const payload: any = { cmd, url: targetUrl, maxTimeout }
    if (haveSession) {
      payload.session = sessionId // proxy is bound to the session
    } else if (fsProxy) {
      payload.proxy = fsProxy // stateless fallback
    }

    if (cmd === 'request.post') {
      const data = originalConfig.data
      payload.postData =
        typeof data === 'string' ? data : new URLSearchParams(data || {}).toString()
    }

    const res = await plain.post(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: maxTimeout + 15000,
      proxy: false,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    })

    const solution = res.data && res.data.solution
    if (!res.data || res.data.status !== 'ok' || !solution) {
      const msg = res.data && res.data.message ? res.data.message : 'unknown error'
      throw new Error(`FlareSolverr did not solve challenge: ${msg}`)
    }

    // Unwrap Chrome's JSON-viewer HTML back to raw JSON for API endpoints.
    const raw = String(solution.response ?? '')
    const data = unwrapJsonViewer(raw) ?? raw

    return {
      data,
      status: solution.status || 200,
      statusText: 'OK',
      headers: {},
      config: originalConfig,
      request: {},
      cached: false
    }
  }

  const handle = async (originalConfig: any) => {
    log(`  [flaresolverr] Cloudflare challenge detected for ${originalConfig?.url} - solving...`)
    const solved = await solve(originalConfig)
    log(`  [flaresolverr] solved ${originalConfig?.url} (${String(solved.data).length} bytes)`)
    return solved
  }

  instance.interceptors.response.use(
    async response => {
      const cfg: any = response?.config
      if (cfg && !cfg.__fsSolved && looksLikeCloudflareChallenge(response)) {
        cfg.__fsSolved = true
        try {
          return await handle(cfg)
        } catch (e: any) {
          log(`  [flaresolverr] failed for ${cfg?.url}: ${e.message}`)
          return response
        }
      }
      return response
    },
    async error => {
      const response = error?.response
      const cfg: any = error?.config || response?.config
      if (response && cfg && !cfg.__fsSolved && looksLikeCloudflareChallenge(response)) {
        cfg.__fsSolved = true
        try {
          return await handle(cfg)
        } catch (e: any) {
          log(`  [flaresolverr] failed for ${cfg?.url}: ${e.message}`)
          return Promise.reject(error)
        }
      }
      return Promise.reject(error)
    }
  )
}
