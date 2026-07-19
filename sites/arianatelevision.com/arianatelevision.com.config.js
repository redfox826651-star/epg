const cheerio = require('cheerio')
const { DateTime } = require('luxon')

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
  site: 'arianatelevision.com',
  days: 2,
  url: 'https://www.arianatelevision.com/program-schedule/',
  parser({ content, date }) {
    const programs = []
    const items = parseItems(content, date)
    items.forEach(item => {
      const prev = programs[programs.length - 1]
      let start = parseStart(item, date)
      if (prev) {
        if (start < prev.start) {
          start = start.plus({ days: 1 })
          date = date.add(1, 'd')
        }
        prev.stop = start
      }
      const stop = start.plus({ minutes: 30 })
      programs.push({
        title: item.title,
        start,
        stop
      })
    })

    return programs
  }
}

function parseStart(item, date) {
  const time = `${date.format('YYYY-MM-DD')} ${item.start}`

  return DateTime.fromFormat(time, 'yyyy-MM-dd H:mm', { zone: 'Asia/Kabul' }).toUTC()
}

function parseItems(content, date) {
  const $ = cheerio.load(content)
  const settings = $('#jtrt_table_settings_508').text()
  if (!settings) return []
  const data = JSON.parse(settings)
  if (!data || !Array.isArray(data)) return []

  let rows = data[0]
  rows.shift()
  const output = []
  rows.forEach(row => {
    let day = date.day() + 2
    if (day > 7) day = 1
    if (!row[0] || !row[day]) return
    output.push({
      start: row[0].trim(),
      title: row[day].trim()
    })
  })

  return output
}
