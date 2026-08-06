const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)

// tvtv.us moved to an HTMX site. The schedule for a station is served by
// /partial/source/{startOfDayUtcMs}/{stationId} and requires the `HX-Request`
// header (otherwise the origin 404s). No lineup is needed - the grabber's
// site_id IS the tvtv.us station id. Each airing carries an absolute unix-ms
// timestamp (data-time) and a runtime in minutes, so times are exact UTC.
//
// NOTE: tvtv.us's Cloudflare challenges some proxy IPs (e.g. iproyal residential)
// for this endpoint. Use a proxy that CF does not challenge for tvtv.us.
module.exports = {
  site: 'tvtv.us',
  days: 2,
  request: {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'HX-Request': 'true',
      'HX-Current-URL': 'https://tvtv.us/'
    }
  },
  url({ channel, date }) {
    const startOfDayMs = dayjs.utc(date).startOf('day').valueOf()
    return `https://tvtv.us/partial/source/${startOfDayMs}/${channel.site_id}`
  },
  parser({ content }) {
    const programs = []
    if (!content) return programs

    const $ = cheerio.load(content)
    $('.gridAiring').each((_, el) => {
      const $a = $(el)
      const startMs = Number($a.attr('data-time'))
      const runtime = Number($a.attr('data-runtime'))
      if (!startMs || !runtime) return

      // Long airings repeat the label in a second inner <div> (a "...Title"
      // sticky copy), so scope to the first inner <div> when present.
      const $inner = $a.children('div').first()
      const $scope = $inner.length ? $inner : $a
      const subTitle = $scope.find('.gridSubtitle').first().text().trim()
      const title = $scope
        .clone()
        .find('.gridSubtitle')
        .remove()
        .end()
        .text()
        .trim()
        .replace(/^\.+/, '')
        .trim()
      if (!title) return

      const start = dayjs.utc(startMs)
      const stop = start.add(runtime, 'minute')

      programs.push({
        title,
        subTitle: subTitle || null,
        start,
        stop
      })
    })

    return programs
  }
}
