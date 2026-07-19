const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

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
  site: 'rtmklik.rtm.gov.my',
  days: 2,
  url: function ({ date, channel }) {
    return `https://rtm.glueapi.io/v3/epg/${
      channel.site_id
    }/ChannelSchedule?dateStart=${date.format('YYYY-MM-DD')}&dateEnd=${date.format(
      'YYYY-MM-DD'
    )}&timezone=0`
  },
  parser: function ({ content }) {
    const programs = []
    const items = parseItems(content)
    if (!items.length) return programs
    items.forEach(item => {
      programs.push({
        title: item.programTitle,
        description: item.description,
        start: parseTime(item.dateTimeStart),
        stop: parseTime(item.dateTimeEnd)
      })
    })

    return programs
  }
}

function parseItems(content) {
  const data = JSON.parse(content)
  return data.schedule ? data.schedule : []
}

function parseTime(time) {
  return dayjs.utc(time, 'YYYY-MM-DDTHH:mm:ss')
}
