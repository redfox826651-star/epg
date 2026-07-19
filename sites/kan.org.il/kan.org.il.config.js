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
  site: 'kan.org.il',
  days: 2,
  url: function ({ channel, date }) {
    return `https://www.kan.org.il/tv-guide/tv_guidePrograms.ashx?stationID=${
      channel.site_id
    }&day=${date.format('DD/MM/YYYY')}`
  },
  parser: function ({ content }) {
    let programs = []
    const items = parseItems(content)
    items.forEach(item => {
      programs.push({
        title: item.title,
        description: item.live_desc,
        image: item.picture_code,
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  }
}

function parseStart(item) {
  if (!item.start_time) return null

  return dayjs.tz(item.start_time, 'YYYY-MM-DDTHH:mm:ss', 'Asia/Jerusalem')
}

function parseStop(item) {
  if (!item.end_time) return null

  return dayjs.tz(item.end_time, 'YYYY-MM-DDTHH:mm:ss', 'Asia/Jerusalem')
}

function parseItems(content) {
  const data = JSON.parse(content)
  if (!Array.isArray(data)) return []

  return data
}
