const { DateTime } = require('luxon')
const axios = require('axios')

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
  site: 'zap.co.ao',
  days: 2,
  url: function ({ date, channel }) {
    return `https://zapon.zapsi.net/ao/m/api/epg/events?date=${date.format('YYYYMMDD')}&channel=${
      channel.site_id
    }`
  },
  parser: function ({ content }) {
    const programs = []
    const items = parseItems(content)
    if (!items.length) return programs
    items.forEach(item => {
      programs.push({
        title: item.programName,
        description: item.programDescription,
        category: item.categoryName,
        start: DateTime.fromSeconds(item.utcBeginDate).toUTC(),
        stop: DateTime.fromSeconds(item.utcEndDate).toUTC()
      })
    })

    return programs
  },
  async channels() {
    const channels = await axios
      .get('https://zapon.zapsi.net/ao/m/api/epg/channels')
      .then(r => r.data.data)
      .catch(console.log)

    return channels.map(item => {
      return {
        lang: 'pt',
        site_id: item.id,
        name: item.name
      }
    })
  }
}

function parseItems(content) {
  const data = JSON.parse(content)

  return data.data || []
}
