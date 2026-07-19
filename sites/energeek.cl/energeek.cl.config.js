const parser = require('epg-parser')

module.exports = {
  site: 'energeek.cl',
  days: 2,
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
  url: 'https://raw.githubusercontent.com/luisms123/tdt/master/guiaenergeek.xml',
  parser: function ({ content, channel, date }) {
    let programs = []
    const items = parseItems(content, channel, date)
    items.forEach(item => {
      programs.push({
        title: item.title?.[0]?.value,
        description: item.desc?.[0]?.value,
        icon: item.icon?.[0]?.src,
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
