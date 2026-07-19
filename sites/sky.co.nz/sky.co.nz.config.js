const axios = require('axios')
const dayjs = require('dayjs')

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
  site: 'sky.co.nz',
  days: 2,
  url({ date, channel }) {
    return `https://web-epg.sky.co.nz/prod/epgs/v1?channelNumber=${
      channel.site_id
    }&start=${date.valueOf()}&end=${date.add(1, 'day').valueOf()}&limit=20000`
  },
  parser({ content }) {
    let programs = []
    const items = parseItems(content)
    items.forEach(item => {
      programs.push({
        title: item.title,
        description: item.synopsis,
        category: item.genres,
        rating: parseRating(item),
        start: dayjs(parseInt(item.start)),
        stop: dayjs(parseInt(item.end))
      })
    })

    return programs
  },
  async channels() {
    const data = await axios
      .get('https://skywebconfig.msl-prod.skycloud.co.nz/sky/json/channels.prod.json')
      .then(r => r.data)
      .catch(console.log)

    return data.channels.map(item => {
      return {
        lang: 'en',
        site_id: parseInt(item.number).toString(),
        name: item.name
      }
    })
  }
}

function parseItems(content) {
  const data = JSON.parse(content)
  return data && data.events && Array.isArray(data.events) ? data.events : []
}

function parseRating(item) {
  if (!item.rating) return null
  return {
    system: 'OFLC',
    value: item.rating
  }
}
