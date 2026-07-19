const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

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
  site: 'freetv.tv',
  days: 2,
  url: function ({ channel, date }) {
    const localDate = dayjs(date).tz('Asia/Jerusalem')
    const since = localDate.startOf('day').format('YYYY-MM-DDTHH:mmZZ')
    const till = localDate.add(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mmZZ')

    return `https://web.freetv.tv/api/products/lives/programmes?liveId[]=${
      channel.site_id
    }&since=${encodeURIComponent(since)}&till=${encodeURIComponent(till)}&lang=HEB&platform=BROWSER`
  },
  parser: function ({ content }) {
    const programs = []
    let items = []
    
    try {
      items = JSON.parse(content)
    } catch {
      return programs
    }

    items.forEach(item => {
      const start = parseStart(item)
      const stop = parseStop(item)
      if (!start.isValid() || !stop.isValid()) return

      programs.push({
        title: item.title,
        description: item.description || item.lead,
        image: getImageUrl(item),
        icon: getImageUrl(item),
        start,
        stop
      })
    })

    return programs
  }
}

function parseStart(item) {
  return item.since ? dayjs.utc(item.since).tz('Asia/Jerusalem') : null
}

function parseStop(item) {
  return item.till ? dayjs.utc(item.till).tz('Asia/Jerusalem') : null
}

function getImageUrl(item) {
  const url = item.images?.['16x9']?.[0]?.url
  return url ? `https:${url}` : null
}
