const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

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
  site: 'pluto.tv',
  days: 3,

  url: function ({ date, channel }) {
    const channelId = channel.site_id

    const localTimezone = dayjs.tz.guess()

    const startTime = dayjs(date).tz(localTimezone).startOf('day').toISOString()
    const endTime = dayjs(date).tz(localTimezone).add(this.days, 'day').endOf('day').toISOString()

    const generatedUrl = `https://api.pluto.tv/v2/channels/${channelId}?start=${startTime}&stop=${endTime}`
    return generatedUrl
  },

  parser: function ({ content }) {
    const data = JSON.parse(content)
    const programs = []

    if (data.timelines) {
      data.timelines.forEach(item => {
        programs.push({
          title: item.title,
          subTitle: item.episode?.name || '',
          description: item.episode?.description || '',
          episode: item.episode?.number || '',
          season: item.episode?.season || '',
          actors: item.episode?.clip?.actors || [],
          categories: [item.episode?.genre, item.episode?.subGenre].filter(Boolean),
          rating: item.episode?.rating || '',
          date: item.episode?.clip?.originalReleaseDate || '',
          icon: item.episode?.series?.tile?.path || '',
          start: item.start,
          stop: item.stop
        })
      })
    }

    return programs
  }
}
