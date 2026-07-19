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
  site: 'tv.cctv.com',
  days: 2,
  url({ channel, date }) {
    return `https://api.cntv.cn/epg/getEpgInfoByChannelNew?serviceId=tvcctv&c=${
      channel.site_id
    }&d=${date.format('YYYYMMDD')}`
  },
  parser({ content, channel }) {
    const programs = []
    const items = parseItems(content, channel)
    items.forEach(item => {
      const title = item.title
      const start = parseStart(item)
      const stop = parseStop(item)
      programs.push({
        title,
        start,
        stop
      })
    })

    return programs
  }
}

function parseStop(item) {
  return dayjs.unix(item.endTime)
}

function parseStart(item) {
  return dayjs.unix(item.startTime)
}

function parseItems(content, channel) {
  const data = JSON.parse(content)
  if (!data || !data.data) return []

  return data.data[channel.site_id].list || []
}
