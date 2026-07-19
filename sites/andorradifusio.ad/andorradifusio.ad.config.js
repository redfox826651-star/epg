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
  site: 'andorradifusio.ad',
  days: 2,
  url({ channel }) {
    return `https://www.andorradifusio.ad/programacio/${channel.site_id}`
  },
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
      const stop = start.plus({ hours: 1 })
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
  const dateString = `${date.format('MM/DD/YYYY')} ${item.time}`

  return DateTime.fromFormat(dateString, 'MM/dd/yyyy HH:mm', { zone: 'Europe/Madrid' }).toUTC()
}

function parseItems(content, date) {
  const $ = cheerio.load(content)
  const day = DateTime.fromMillis(date.valueOf()).setLocale('ca').toFormat('dd LLLL').toLowerCase()
  const column = $('.programacio-dia > h3 > .dia')
    .filter((i, el) => $(el).text() === day.slice(0, 6) + '.')
    .first()
    .parent()
    .parent()
  const items = []
  const titles = column.find('p').toArray()
  column.find('h4').each((i, time) => {
    items.push({
      time: $(time).text(),
      title: $(titles[i]).text()
    })
  })

  return items
}
