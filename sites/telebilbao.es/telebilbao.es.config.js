const dayjs = require('dayjs')
const cheerio = require('cheerio')
const table2array = require('table2array')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

require('dayjs/locale/es')

module.exports = {
  site: 'telebilbao.es',
  days: 1,
  url: 'https://www.telebilbao.es/programacion-2/',
  request: {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Linux x86_64) AppleWebKit/600.3 (KHTML, like Gecko) Chrome/48.0.2544.291 Safari/600',
      'Accept': 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    },
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  parser({ content, date }) {
    let programs = []
    const items = parseItems(content, date)
    items.forEach(item => {
      const prev = programs[programs.length - 1]
      let start = parseStart(item, date)
      if (prev) {
        if (start.isBefore(prev.start)) {
          start = start.add(1, 'd')
          date = date.add(1, 'd')
        }
        prev.stop = start
      }
      const stop = start.add(30, 'm')

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
  return dayjs.tz(`${date.format('YYYY-MM-DD')} ${item.time}`, 'YYYY-MM-DD HH:mm', 'Europe/Madrid')
}

function parseItems(content, date) {
  const $ = cheerio.load(content)
  const tableHtml = $('table.programacion').html()
  let tableArray = table2array(`<table>${tableHtml}</table>`)
  const day = date.locale('es').format('dddd\nD MMMM').toUpperCase()
  if (!tableArray[0]) return []
  const indexOfColumn = tableArray[0].indexOf(day)
  tableArray.pop()
  const items = []
  tableArray.forEach(row => {
    items.push({
      time: row[0],
      title: row[indexOfColumn]
    })
  })

  return items.filter(i => Boolean(i.time))
}
