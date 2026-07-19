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
  site: 'i24news.tv',
  days: 2,
  url: function ({ channel }) {
    return `https://api.i24news.tv/v2/${channel.site_id}/schedules`
  },
  parser: function ({ content, date }) {
    let programs = []
    const items = parseItems(content, date)
    items.forEach(item => {
      if (!item.show) return
      programs.push({
        title: item.show.title,
        description: item.show.body,
        image: parseImage(item),
        start: parseStart(item, date),
        stop: parseStop(item, date)
      })
    })

    return programs
  }
}

function parseImage(item) {
  return item.show.image ? item.show.image.href : null
}

function parseStart(item, date) {
  if (!item.startHour) return null

  return dayjs.tz(
    `${date.format('YYYY-MM-DD')} ${item.startHour}`,
    'YYYY-MM-DD HH:mm',
    'Asia/Jerusalem'
  )
}

function parseStop(item, date) {
  if (!item.endHour) return null

  return dayjs.tz(
    `${date.format('YYYY-MM-DD')} ${item.endHour}`,
    'YYYY-MM-DD HH:mm',
    'Asia/Jerusalem'
  )
}

function parseItems(content, date) {
  const data = JSON.parse(content)
  if (!Array.isArray(data)) return []
  let day = date.day() - 1
  day = day < 0 ? 6 : day

  return data.filter(item => item.day === day)
}
