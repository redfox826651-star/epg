const dayjs = require('dayjs')

module.exports = {
  site: 'siba.com.co',
  days: 2,
  url: 'http://devportal.siba.com.co/index.php?action=grilla',
  request: {
    method: 'POST',
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Linux x86_64) AppleWebKit/600.3 (KHTML, like Gecko) Chrome/48.0.2544.291 Safari/600',
      'Accept': 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    data({ channel, date }) {
      const params = new URLSearchParams()
      params.append('servicio', '10')
      params.append('ini', date.unix())
      params.append('end', date.add(1, 'd').unix())
      params.append('chn', channel.site_id)

      return params
    }
  },
  parser: function ({ content, channel }) {
    let programs = []
    const items = parseItems(content, channel)
    items.forEach(item => {
      programs.push({
        title: item.nom,
        start: parseStart(item).toJSON(),
        stop: parseStop(item).toJSON()
      })
    })

    return programs
  }
}

function parseStart(item) {
  return dayjs.unix(item.ini)
}

function parseStop(item) {
  return dayjs.unix(item.fin)
}

function parseContent(content, channel) {
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.list)) return null

  return data.list.find(i => i.id === channel.site_id)
}

function parseItems(content, channel) {
  const data = parseContent(content, channel)

  return data ? data.prog : []
}
