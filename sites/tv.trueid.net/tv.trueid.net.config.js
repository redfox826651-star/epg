const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)

module.exports = {
  request: {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Linux x86_64) AppleWebKit/600.3 (KHTML, like Gecko) Chrome/48.0.2544.291 Safari/600',
      'Accept': 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  },
  delay: 1000,
  site: 'tv.trueid.net',
  days: 1,
  buildId: undefined,
  async url({ channel }) {
    if (module.exports.buildId === undefined || module.exports.buildId === null) {
      module.exports.buildId = await module.exports.fetchBuildId()
    }
    return `https://tv.trueid.net/_next/data/${module.exports.buildId}/th-${channel.lang}.json?channelSlug=${channel.site_id}&path=${channel.site_id}`
  },
  parser({ content, channel }) {
    const programs = []
    parseItems(content, channel).forEach(item => {
      programs.push({
        title: item.title,
        description: parseDescription(item, channel.lang),
        image: parseImage(item),
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  },
  async channels({ lang = 'en' }) {
    if (module.exports.buildId === undefined || module.exports.buildId === null) {
      module.exports.buildId = await module.exports.fetchBuildId()
    }

    const data = await axios
      .get(`https://tv.trueid.net/_next/data/${module.exports.buildId}/th-${lang}.json`)
      .then(r => r.data?.pageProps)
      .catch(console.error)

    if (!data?.channelList) {
      return []
    }

    return data.channelList
      .filter(i => i.content_type === 'livetv')
      .map(item => {
        return {
          lang,
          site_id: item.slug,
          name: item.title,
          logo: item.thumb
        }
      })
  },
  // Since the website uses Next.js, each time the developers deploy a new version, a new build ID is generated.
  // This permits us to always fetch the proper build ID before making requests.
  //
  // The build-id page is behind Cloudflare. From this server's IP it usually returns 200, but
  // intermittently gets challenged - and when it does, buildId ends up null and EVERY EPG
  // request breaks (the URL becomes .../data/null/...). So we fetch it through FlareSolverr
  // (which solves the challenge), falling back to a direct request if FlareSolverr is down.
  // NOTE: this page is 403 via the residential proxy, so FlareSolverr is called WITHOUT a proxy.
  async fetchBuildId() {
    const url = 'https://tv.trueid.net/th-en'
    let data = null

    try {
      data = await module.exports.fetchViaFlareSolverr(url)
    } catch (err) {
      console.error('tv.trueid.net: FlareSolverr buildId fetch failed:', err.message)
    }

    if (!data) {
      data = await axios
        .get(url)
        .then(r => r.data)
        .catch(console.error)
    }

    if (data) {
      const $ = cheerio.load(data)
      const nextData = JSON.parse($('#__NEXT_DATA__').text())
      return nextData?.buildId || null
    }

    return null
  },
  async fetchViaFlareSolverr(url) {
    const endpoint = process.env.FLARESOLVERR_URL || 'http://127.0.0.1:8191/v1'
    const res = await axios.post(
      endpoint,
      { cmd: 'request.get', url, maxTimeout: 60000 },
      { headers: { 'Content-Type': 'application/json' }, timeout: 75000, proxy: false }
    )

    const solution = res.data && res.data.solution
    if (!res.data || res.data.status !== 'ok' || !solution) {
      throw new Error(res.data && res.data.message ? res.data.message : 'no solution')
    }

    return solution.response
  }
}

function parseDescription(item, lang) {
  const description = item.info?.[`synopsis_${lang}`]
  return description && description !== '.' ? description : null
}

function parseImage(item) {
  return item.info?.image || null
}

function parseStart(item) {
  return item.start_date ? dayjs.utc(item.start_date) : null
}

function parseStop(item) {
  return item.end_date ? dayjs.utc(item.end_date) : null
}

function parseItems(content) {
  const data = content ? JSON.parse(content) : null
  return data?.pageProps?.epgList || []
}
