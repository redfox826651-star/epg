const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const axios = require('axios')
const uniqBy = require('lodash.uniqby')

dayjs.extend(utc)

module.exports = {
  request: {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'x-requested-with': 'XMLHttpRequest',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },
  site: 'tv.mail.ru',
  days: 2,
  delay: 1000,
  // The old /ajax/channel/ endpoint was removed (404). The schedule now lives at
  // /ajax/service/channels/schedule/ and returns JSON with absolute unix
  // timestamps (start_ts/stop_ts), so no timezone handling is required.
  url({ channel, date }) {
    return `https://tv.mail.ru/ajax/service/channels/schedule/?channel_id=${
      channel.site_id
    }&date=${date.format('YYYY-MM-DD')}`
  },
  parser({ content }) {
    const programs = []
    let json
    try {
      json = JSON.parse(content)
    } catch {
      return programs
    }

    const events = (json && json.data && json.data.events) || []
    events.forEach(item => {
      if (!item.start_ts) return
      programs.push({
        title: item.name,
        category: parseCategory(item),
        start: dayjs.unix(item.start_ts).utc(),
        stop: dayjs.unix(item.stop_ts || item.start_ts + 3600).utc()
      })
    })

    return programs
  },
  async channels() {
    const regions = [5506, 1096, 1125, 285]

    let channels = []
    for (let region of regions) {
      const totalPages = await getTotalPageCount(region)
      const pages = Array.from(Array(totalPages).keys())
      for (let page of pages) {
        const data = await axios
          .get('https://tv.mail.ru/ajax/channel/list/', {
            params: { page },
            headers: {
              cookie: `s=fver=0|geo=${region};`
            }
          })
          .then(r => r.data)
          .catch(console.log)

        data.channels.forEach(item => {
          channels.push({
            lang: 'ru',
            name: item.name,
            site_id: item.id
          })
        })
      }
    }

    return uniqBy(channels, 'site_id')
  }
}

async function getTotalPageCount(region) {
  const data = await axios
    .get('https://tv.mail.ru/ajax/channel/list/', {
      params: { page: 0 },
      headers: {
        cookie: `s=fver=0|geo=${region};`
      }
    })
    .then(r => r.data)
    .catch(console.log)

  return data.total
}

function parseCategory(item) {
  const categories = {
    1: 'Фильм',
    2: 'Сериал',
    6: 'Документальное',
    7: 'Телемагазин',
    8: 'Позновательное',
    10: 'Другое',
    14: 'ТВ-шоу',
    16: 'Досуг,Хобби',
    17: 'Ток-шоу',
    18: 'Юмористическое',
    23: 'Музыка',
    24: 'Развлекательное',
    25: 'Игровое',
    26: 'Новости'
  }

  return categories[item.category_id]
    ? {
        lang: 'ru',
        value: categories[item.category_id]
      }
    : null
}
