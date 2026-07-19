const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'galamtv.kz',
  timezone: 'Asia/Almaty',
  days: 2,
  request: {
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Linux x86_64) AppleWebKit/600.3 (KHTML, like Gecko) Chrome/48.0.2544.291 Safari/600',
      'Accept': 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      Referer: 'https://galamtv.kz/',
      Origin: 'https://galamtv.kz',
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate, br, zstd'
    }
  },
  url({ channel, date }) {
    const todayEpoch = date.startOf('day').unix()
    const nextDayEpoch = date.add(1, 'day').startOf('day').unix()
    return `https://galam.server-api.lfstrm.tv/channels/${channel.site_id}/programs?period=${todayEpoch}:${nextDayEpoch}`
  },
  parser: function ({ content }) {
    let programs = []
    const data = JSON.parse(content)
    const programsData = data.programs || []

    programsData.forEach(program => {
      const start = dayjs.unix(program.scheduleInfo.start)
      const stop = dayjs.unix(program.scheduleInfo.end)

      programs.push({
        title: program.metaInfo.title,
        description: program.metaInfo.description,
        image: program.mediaInfo.thumbnails[0].url,
        start,
        stop
      })
    })

    return programs
  },
  async channels() {
    try {
      const response = await axios.get('https://galam.server-api.lfstrm.tv/channels-now')
      return response.data.channels.map(item => {
        return {
          lang: 'kk',
          site_id: item.channels.id,
          name: item.channels.info.metaInfo.title
        }
      })
    } catch (error) {
      console.error('Error fetching channels:', error)
      return []
    }
  }
}
