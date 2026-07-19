const parser = require('epg-parser')

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
  site: 'makrodigitaltelevision.com',
  days: 3,
  url: 'https://makrodigitaltelevision.com/epg.xml',
  parser({ content, date, channel }) {
    let programs = []
    const items = parseItems(content, channel, date)
    items.forEach(item => {
      programs.push({
        title: item.title?.[0]?.value,
        start: item.start,
        stop: item.stop
      })
    })

    return programs
  }
}

function parseItems(content, channel, date) {
  const { programs } = parser.parse(content)

  return programs.filter(p => p.channel === channel.site_id && date.isSame(p.start, 'day'))
}
