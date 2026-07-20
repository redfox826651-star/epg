const cheerio = require('cheerio')
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const sortBy = require('lodash.sortby')
const uniqBy = require('lodash.uniqby')

dayjs.extend(customParseFormat)
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
  site: 'streamingtvguides.com',
  days: 2,
  url({ channel }) {
    return `https://streamingtvguides.com/Channel/${channel.site_id}`
  },
  // The site was redesigned: each program is an `.program-card` whose trigger
  // button carries data-program-* attributes. Times are shown in the timezone
  // the page reports ("listings in America/..."), which the site localizes by
  // IP, so we read that tz from each response instead of hard-coding it.
  parser({ content, date }) {
    const tz = extractTimezone(content)
    const $ = cheerio.load(content)
    let programs = []

    $('[data-program-time]').each((i, el) => {
      const title = ($(el).attr('data-program-title') || '').trim()
      const timeStr = $(el).attr('data-program-time')
      if (!title || !timeStr) return

      const slot = parseTimeSlot(timeStr, date, tz)
      if (!slot) return
      if (!date.isSame(slot.start, 'd')) return

      programs.push({
        title,
        description: ($(el).attr('data-program-description') || '').trim() || null,
        start: slot.start,
        stop: slot.stop
      })
    })

    programs = sortBy(
      uniqBy(programs, p => p.start.valueOf()),
      p => p.start.valueOf()
    )

    return programs
  },
  async channels() {
    const axios = require('axios')
    const data = await axios
      .get('https://streamingtvguides.com/Preferences')
      .then(r => r.data)
      .catch(console.log)

    let channels = []

    const $ = cheerio.load(data)
    $('#channel-group-all > div > div').each((i, el) => {
      const site_id = $(el).find('input').attr('value').replace('&', '&amp;')
      const label = $(el).text().trim()
      const svgTitle = $(el).find('svg').attr('alt')
      const name = (label || svgTitle || '').replace(site_id, '').trim()

      if (!name || !site_id) return

      channels.push({
        lang: 'en',
        site_id,
        name
      })
    })

    return channels
  }
}

// The page declares its timezone, e.g. "Current and upcoming ... listings in America/Los_Angeles."
function extractTimezone(content) {
  const m =
    content.match(/listings in ([A-Za-z_]+\/[A-Za-z_]+)/) ||
    content.match(/\b([A-Za-z_]+\/[A-Za-z_]+)\b/)

  return m ? m[1] : 'America/Los_Angeles'
}

// data-program-time looks like "Sun, Jul 19 11:00 PM - 6:00 AM" (no year; the
// stop time may roll past midnight). Returns { start, stop } as UTC dayjs.
function parseTimeSlot(str, date, tz) {
  const m = String(str).match(
    /^\w+,\s*([A-Za-z]+)\s+(\d{1,2})\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i
  )
  if (!m) return null

  const [, mon, day, startT, stopT] = m
  const year = inferYear(mon, Number(day), date, tz)

  const start = dayjs.tz(`${mon} ${day} ${year} ${startT}`, 'MMM D YYYY h:mm A', tz)
  let stop = dayjs.tz(`${mon} ${day} ${year} ${stopT}`, 'MMM D YYYY h:mm A', tz)

  if (!start.isValid() || !stop.isValid()) return null
  if (!stop.isAfter(start)) stop = stop.add(1, 'day')

  return { start: start.utc(), stop: stop.utc() }
}

// The listing omits the year; pick the one that puts the date closest to the
// day being grabbed (handles the Dec/Jan boundary).
function inferYear(mon, day, date, tz) {
  let year = date.year()
  const candidate = dayjs.tz(`${mon} ${day} ${year}`, 'MMM D YYYY', tz)

  if (candidate.isValid()) {
    const diff = candidate.diff(date, 'day')
    if (diff > 180) year -= 1
    else if (diff < -180) year += 1
  }

  return year
}
