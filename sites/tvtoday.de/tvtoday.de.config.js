const axios = require('axios')

module.exports = {
  site: 'tvtoday.de',
  days: 1,
  url({ channel, date }) {
    return `https://www.tvtoday.de/api/broadcasts?channelId[]=${
      channel.site_id
    }&dates[]=${date.format('YYYY-M-D')}&timeFrame=day`
  },
  request: {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Linux; Linux x86_64) AppleWebKit/600.3 (KHTML, like Gecko) Chrome/48.0.2544.291 Safari/600'
    }
  },
  parser({ content }) {
    const items = parseItems(content)

    return items.map(item => {
      const imagePath = item.images?.[0]?.path

      return {
        title: item.title,
        description: item.subtitle,
        image: !imagePath ? '' : `https://img.tvspielfilm.de${imagePath}`,
        start: item.startDate,
        stop: item.endDate
      }
    })
  },
  async channels() {
    const data = await axios
      .get('https://www.tvtoday.de/api/channels', {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Linux; Linux x86_64) AppleWebKit/600.3 (KHTML, like Gecko) Chrome/48.0.2544.291 Safari/600'
        }
      })
      .then(r => r.data)
      .catch(console.error)

    return data.map(channel => ({
      lang: 'country_DE',
      name: channel.channelName,
      site_id: channel.channelId
    }))
  }
}

function parseItems(content) {
  try {
    const data = JSON.parse(content)
    if (!data || !Array.isArray(data.items)) return []

    return data.items
  } catch {
    return []
  }
}
