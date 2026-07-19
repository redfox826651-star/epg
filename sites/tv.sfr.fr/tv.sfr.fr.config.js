const axios = require('axios')
const dayjs = require('dayjs')

module.exports = {
  site: 'tv.sfr.fr',
  days: 2,
  url({ date }) {
    return `https://static-cdn.tv.sfr.net/data/epg/gen8/guide_web_${date.format('YYYYMMDD')}.json`
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
    maxContentLength: 20 * 1024 * 1024, // 20Mb
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  parser({ content, channel }) {
    let programs = []
    let items = parseItems(content, channel)
    items.forEach(item => {
      programs.push({
        start: dayjs(item.startDate),
        stop: dayjs(item.endDate),
        title: item.title,
        subTitle: item.subTitle || null,
        category: item.genre,
        description: item.longSynopsis,
        icon: getIconURL(item.images),
        images: item.images.map(img => img.url),
        season: item.seasonNumber || null,
        episode: item.episodeNumber || null
      })
    })

    return programs
  },
  async channels() {
    const data = await axios
      .get('https://api.sfr.fr/service-channel/api/rest/v2/channels')
      .then(r => r.data)
      .catch(console.error)

    let channels = {}
    Object.values(data.data.chaines).forEach(channel => {
      if (!channels[channel.epg_id]) {
        channels[channel.epg_id] = {
          lang: 'fr',
          site_id: channel.epg_id,
          name: channel.nom_chaine
        }
      }
    })

    return Object.values(channels)
  }
}

function parseItems(content, channel) {
  try {
    const data = JSON.parse(content)
    if (!data || !data.epg || !Array.isArray(data.epg[channel.site_id])) return []

    return data.epg[channel.site_id]
  } catch {
    return []
  }
}

function getIconURL(images) {
  let icon = images.find(icon => icon.type === 'landscape' && icon.withTitle === true ) ||
             images.find(icon => icon.type === 'landscape' ) ||
             images[0]
  
  if (icon)
    return icon.url
}
