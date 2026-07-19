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
  site: 'frikanalen.no',
  days: 2,
  url({ date }) {
    return `https://frikanalen.no/api/scheduleitems/?date=${date.format(
      'YYYY-MM-DD'
    )}&format=json&limit=100`
  },
  parser({ content }) {
    let programs = []
    const items = parseItems(content)
    items.forEach(item => {
      programs.push({
        title: parseTitle(item),
        category: parseCategory(item),
        description: parseDescription(item),
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  }
}

function parseTitle(item) {
  return item.video.name
}

function parseCategory(item) {
  return item.video.categories
}

function parseDescription(item) {
  return item.video.header
}

function parseStart(item) {
  return dayjs(item.starttime)
}

function parseStop(item) {
  return dayjs(item.endtime)
}

function parseItems(content) {
  const data = JSON.parse(content)

  return data && Array.isArray(data.results) ? data.results : []
}
