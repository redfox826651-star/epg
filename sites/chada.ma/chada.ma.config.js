const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'chada.ma',
  channels: 'chada.ma.channels.xml',
  days: 1,
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
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url() {
    return 'https://chada.ma/fr/chada-tv/grille-tv/'
  },
  parser: function ({ content }) {
    const $ = cheerio.load(content)
    const programs = []

    $('#stopfix .posts-area h2').each((i, element) => {
      const timeRange = $(element).text().trim()
      const [start, stop] = timeRange.split(' - ').map(t => parseProgramTime(t.trim()))

      const titleElement = $(element).next('div').next('h3')
      const title = titleElement.text().trim()

      const description = titleElement.next('div').text().trim() || 'No description available'

      programs.push({
        title,
        description,
        start,
        stop
      })
    })

    return programs
  }
}

function parseProgramTime(timeStr) {
  const timeZone = 'Africa/Casablanca'
  const currentDate = dayjs().format('YYYY-MM-DD')

  return dayjs
    .tz(`${currentDate} ${timeStr}`, 'YYYY-MM-DD HH:mm', timeZone)
    .format('YYYY-MM-DDTHH:mm:ssZ')
}
