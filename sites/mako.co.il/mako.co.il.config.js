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
  site: 'mako.co.il',
  days: 2,
  url: 'https://www.mako.co.il/AjaxPage?jspName=EPGResponse.jsp',
  parser: function ({ content, date }) {
    let programs = []
    const items = parseItems(content, date)
    items.forEach(item => {
      const start = parseStart(item)
      const stop = start.add(item.DurationMs, 'ms')
      programs.push({
        title: item.ProgramName,
        description: item.EventDescription,
        image: item.Picture,
        start,
        stop
      })
    })

    return programs
  }
}

function parseStart(item) {
  if (!item.StartTimeUTC) return null

  return dayjs(item.StartTimeUTC)
}

function parseItems(content, date) {
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.programs)) return []
  const d = date.format('DD/MM/YYYY')

  return data.programs.filter(item => item.Date.startsWith(d))
}
