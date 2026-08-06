const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const os = require('os')
const { execFileSync } = require('child_process')

dayjs.extend(utc)

// Cloudflare on tvtv.us fingerprints the TLS client (JA3): Node/axios is
// challenged, a real Chrome is not. We fetch through curl-impersonate (Chrome
// JA3) instead, forwarding the grabber's proxy (GRAB_PROXY, set by getEPG) and
// the HX-* headers. The schedule endpoint is /partial/source/{startOfDayMs}/
// {stationId} and REQUIRES the HX-Request header; no lineup is needed - the
// grabber's site_id IS the tvtv.us station id. Airings carry an absolute
// unix-ms data-time + data-runtime (minutes) => exact UTC.
const CURL_IMPERSONATE =
  process.env.CURL_IMPERSONATE || `${os.homedir()}/curl-impersonate/curl_chrome136`

function curlImpersonateAdapter(config) {
  const args = ['-s', '--max-time', '60', '--compressed']

  const proxy = process.env.GRAB_PROXY
  if (proxy) args.push('--proxy', proxy)

  // Forward only the HX-* / Referer headers; let curl-impersonate supply the
  // Chrome UA + sec-ch-ua/Accept headers so the fingerprint stays consistent.
  const headers =
    config.headers && typeof config.headers.toJSON === 'function'
      ? config.headers.toJSON()
      : config.headers || {}
  for (const key of Object.keys(headers)) {
    if (/^(hx-|referer$)/i.test(key) && headers[key] != null) {
      args.push('-H', `${key}: ${headers[key]}`)
    }
  }

  args.push(config.url)

  const data = execFileSync(CURL_IMPERSONATE, args, {
    maxBuffer: 32 * 1024 * 1024
  }).toString()

  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {}
  })
}

module.exports = {
  site: 'tvtv.us',
  days: 2,
  request: {
    adapter: curlImpersonateAdapter,
    headers: {
      'HX-Request': 'true',
      'HX-Current-URL': 'https://tvtv.us/'
    }
  },
  url({ channel, date }) {
    const startOfDayMs = dayjs.utc(date).startOf('day').valueOf()
    return `https://tvtv.us/partial/source/${startOfDayMs}/${channel.site_id}`
  },
  parser({ content }) {
    const programs = []
    if (!content) return programs

    const $ = cheerio.load(content)
    $('.gridAiring').each((_, el) => {
      const $a = $(el)
      const startMs = Number($a.attr('data-time'))
      const runtime = Number($a.attr('data-runtime'))
      if (!startMs || !runtime) return

      // Long airings repeat the label in a second inner <div>; scope to the first.
      const $inner = $a.children('div').first()
      const $scope = $inner.length ? $inner : $a
      const subTitle = $scope.find('.gridSubtitle').first().text().trim()
      const title = $scope
        .clone()
        .find('.gridSubtitle')
        .remove()
        .end()
        .text()
        .trim()
        .replace(/^\.+/, '')
        .trim()
      if (!title) return

      const start = dayjs.utc(startMs)
      const stop = start.add(runtime, 'minute')

      programs.push({ title, subTitle: subTitle || null, start, stop })
    })

    return programs
  }
}
