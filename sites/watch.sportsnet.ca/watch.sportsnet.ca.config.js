const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)

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
  site: 'watch.sportsnet.ca',
  days: 2,
  url: function ({ channel, date }) {
    return `https://production-cdn.sportsnet.ca/api/schedules?channels=${
      channel.site_id
    }&date=${date.format('YYYY-MM-DD')}&duration=24&hour=0`
  },
  parser: function ({ content }) {
    let programs = []
    const items = parseItems(content)
    items.forEach(item => {
      programs.push({
        title: item.item.title,
        description: item.item.shortDescription,
        image: parseImage(item),
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  },
  async channels() {
    const axios = require('axios')
    const html = await axios
      .get('https://watch.sportsnet.ca/schedule/tvlistings')
      .then(r => r.data)
      .catch(console.log)

    let [, __data] = html.match(/window\.__data = ([^<]+)<\/script>/)
    const func = new Function(`"use strict";return ${__data}`)
    const data = func()

    return data.cache.list['678|page_size=24'].list.items.map(item => {
      return {
        lang: 'en',
        site_id: item.id,
        name: item.title
      }
    })
  }
}

function parseImage(item) {
  if (!item.item || !item.item.images) return null

  return item.item.images.tile
}

function parseStart(item) {
  return dayjs.utc(item.startDate)
}

function parseStop(item) {
  return dayjs.utc(item.endDate)
}

function parseItems(content) {
  const data = JSON.parse(content)
  if (!Array.isArray(data) || !Array.isArray(data[0].schedules)) return []

  return data[0].schedules
}
