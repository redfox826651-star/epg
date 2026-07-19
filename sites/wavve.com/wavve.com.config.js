const axios = require('axios')
const { DateTime } = require('luxon')

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
  site: 'wavve.com',
  days: 2,
  url: function ({ channel, date }) {
    return `https://apis.pooq.co.kr/live/epgs/channels/${
      channel.site_id
    }?startdatetime=${date.format('YYYY-MM-DD')}%2000%3A00&enddatetime=${date
      .add(1, 'd')
      .format('YYYY-MM-DD')}%2000%3A00&apikey=E5F3E0D30947AA5440556471321BB6D9&limit=500`
  },
  parser: function ({ content }) {
    let programs = []
    const items = parseItems(content)
    items.forEach(item => {
      programs.push({
        title: item.title,
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  },
  async channels() {
    const channels = []

    const data = await axios
      .get(
        'https://apis.pooq.co.kr/live/epgs?enddatetime=2022-04-17%2019%3A00&genre=all&limit=500&startdatetime=2022-04-17%2016%3A00&apikey=E5F3E0D30947AA5440556471321BB6D9'
      )
      .then(r => r.data)
      .catch(console.log)

    data.list.forEach(i => {
      channels.push({
        name: i.channelname,
        site_id: i.channelid,
        lang: 'ko'
      })
    })

    return channels
  }
}

function parseStart(item) {
  return DateTime.fromFormat(item.starttime, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Seoul' }).toUTC()
}

function parseStop(item) {
  return DateTime.fromFormat(item.endtime, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Seoul' }).toUTC()
}

function parseItems(content) {
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.list)) return []

  return data.list
}
