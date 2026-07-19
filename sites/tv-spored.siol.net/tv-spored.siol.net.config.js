const axios = require('axios')
const cheerio = require('cheerio')

module.exports = {
  site: 'tv-spored.siol.net',
  days: 2,
  url({ channel, date }) {
    return `https://tv-spored.siol.net/kanal/${channel.site_id}/datum/${date.format('YYYYMMDD')}`
  },
  request: {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Linux x86_64) AppleWebKit/600.3 (KHTML, like Gecko) Chrome/48.0.2544.291 Safari/600',
      'Accept': 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      Accept: 'text/html'
    }
  },
  parser({ content, date }) {
    const items = parseItems(content, date)

    return items.map(item => ({
      title: item.title,
      category: item.category,
      season: item.season,
      episode: item.episode,
      start: item.startDateTime,
      stop: item.stopDateTime
    }))
  },
  async channels() {
    const content = await axios
      .get('https://tv-spored.siol.net/', {
        headers: {
          Accept: 'text/html'
        }
      })
      .then(r => r.data)
      .catch(console.log)

    const $ = cheerio.load(content)
    const script = $('script:contains(tvChannelsAsJson)').text()
    const func = new Function(`const self = { __next_f: [] };${script};return self.__next_f`)
    const __next_f = func()
    if (!__next_f[0] || !__next_f[0][1]) return []
    const [, dataString] = __next_f[0][1].split(/:(.*)/s)
    const data = JSON.parse(dataString)
    const tvChannelsAsJson = findByKey(data, 'tvChannelsAsJson')

    return tvChannelsAsJson.map(item => ({
      name: item.name,
      site_id: item.externalId.toLowerCase(),
      lang: 'sl'
    }))
  }
}

function parseItems(content, date) {
  try {
    const $ = cheerio.load(content)
    const script = $('script:contains(channelsAsJson)').text()
    const func = new Function(`const self = { __next_f: [] };${script};return self.__next_f`)
    const __next_f = func()
    if (!__next_f[0] || !__next_f[0][1]) return []
    const [, dataString] = __next_f[0][1].split(/:(.*)/s)
    const data = JSON.parse(dataString)
    const channelsAsJson = findByKey(data, 'channelsAsJson')

    if (!channelsAsJson[0] || !Array.isArray(channelsAsJson[0].events)) return []

    return channelsAsJson[0].events.filter(p => date.isSame(p.startDateTime, 'day'))
  } catch {
    return []
  }
}

function findByKey(arr, key) {
  if (!Array.isArray(arr)) return
  return arr.reduce((a, item) => {
    if (a) return a
    if (item && item[key]) return item[key]
    if (item && item.children) return findByKey(item.children, key)
    if (Array.isArray(item)) return findByKey(item, key)
  }, null)
}
