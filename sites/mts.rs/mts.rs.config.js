const axios = require('axios')
const dayjs = require('dayjs')

module.exports = {
  site: 'mts.rs',
  days: 2,
  url({ date }) {
    return `https://mts.rs/hybris/ecommerce/b2c/v1/products/search?sort=pozicija-rastuce&searchQueryContext=CHANNEL_PROGRAM&query=:pozicija-rastuce:tip-kanala-radio:TV kanali:channelProgramDates:${date.format(
      'YYYY-MM-DD'
    )}&pageSize=10000`
  },
  request: {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Linux x86_64) AppleWebKit/600.3 (KHTML, like Gecko) Chrome/48.0.2544.291 Safari/600',
      'Accept': 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    },
    maxContentLength: 10000000 // 10 Mb
  },
  parser({ content, channel }) {
    const items = parseItems(content, channel)

    return items.map(item => {
      return {
        title: item.title,
        category: item.category,
        description: item.description,
        image: item?.picture?.url || null,
        start: dayjs(item.start),
        stop: dayjs(item.end)
      }
    })
  },
  async channels() {
    const data = await axios
      .get(module.exports.url({ date: dayjs() }))
      .then(r => r.data)
      .catch(console.error)

    return data.products.map(channel => ({
      lang: 'bs',
      name: channel.name,
      site_id: encodeURIComponent(channel.code)
    }))
  }
}

function parseItems(content, channel) {
  try {
    const data = JSON.parse(content)
    if (!data || !Array.isArray(data.products)) return []

    const channelData = data.products.find(c => c.code === channel.site_id)
    if (!channelData || !Array.isArray(channelData.programs)) return []

    return channelData.programs
  } catch {
    return []
  }
}
