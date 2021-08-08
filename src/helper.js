const Axios = require('axios')
const util = require('util')
const { parse } = require('iptv-playlist-parser')
const { isWebUri } = require('valid-url')
const { existsSync, readFile } = require('fs')

const execAsync = util.promisify(require('child_process').exec)
const readFileAsync = util.promisify(readFile)

const axios = Axios.create({
  method: 'GET',
  timeout: 60000, // 60 second timeout
  responseType: 'text',
})

axios.interceptors.response.use(
  response => {
    const { 'content-type': contentType = '' } = response.headers
    if (!/mpegurl/.test(contentType)) {
      throw new Error('URL is not an .m3u playlist file')
    }
    return response.data
  },
  () => {
    let msg = `Error fetching playlist`

    return Promise.reject(new Error(msg))
  }
)

let cache = new Set()

function hashUrl(u) {
  return Buffer.from(u).toString(`hex`)
}

function addToCache({ url }) {
  let id = hashUrl(url)

  cache.add(id)
}

function checkCache({ url }) {
  let id = hashUrl(url)

  return cache.has(id)
}

async function parsePlaylist(input) {
  if (input instanceof Object && Reflect.has(input, `items`)) return input

  let data = input

  if (Buffer.isBuffer(input)) {
    data = input.toString(`utf8`)
  } else if (typeof input === `string`) {
    if (isWebUri(input)) {
      data = await axios(input)
    } else if (existsSync(input)) {
      data = await readFileAsync(input, { encoding: `utf8` })
    }
  }

  return parse(data)
}

function parseMessage(reason, { url }) {
  if (!reason) return

  const msgArr = reason.split('\n')

  if (msgArr.length === 0) return

  const line = msgArr.find(line => {
    return line.indexOf(url) === 0
  })

  if (!line) {
    if (/^Command failed/.test(reason)) return `Timed out`
    return reason
  }

  return line.replace(`${url}: `, '')
}

function isJSON(str) {
  try {
    return !!JSON.parse(str)
  } catch (e) {
    return false
  }
}

function checkItem(item) {
  const { url, http = {} } = item
  let { referrer = ``, 'user-agent': itemUserAgent = `` } = http
  const { config, logger } = this

  let args = [
    `ffprobe`,
    `-of json`,
    `-v error`,
    `-hide_banner`,
    `-show_streams`,
  ]

  const userAgent = itemUserAgent.length ? itemUserAgent : config.userAgent
  if (referrer.length) {
    args.push(`-headers`, `'Referer: ${referrer}'`)
  }

  if (userAgent) {
    args.push(`-user_agent`, `'${userAgent}'`)
  }

  args.push(`'${url}'`)

  args = args.join(` `)

  logger.debug(`EXECUTING: "${args}"`)

  return execAsync(args, { timeout: config.timeout })
    .then(({ stdout }) => {
      if (!isJSON(stdout)) {
        return { ok: false, reason: parseMessage(stdout, item) }
      }
      const metadata = JSON.parse(stdout)
      if (!metadata.streams.length)
        return { ok: false, reason: 'No working streams' }
      return { ok: true, metadata }
    })
    .catch(err => ({ ok: false, reason: parseMessage(err.message, item) }))
}

async function validateStatus(item) {
  item.status = await checkItem.call(this, item)
  const { config, logger } = this

  if (item.status.ok) {
    logger.debug(`OK: ${item.url}`.green)
  } else {
    logger.debug(`FAILED: ${item.url} (${item.status.reason})`.red)
  }

  await config.afterEach.call(null, item)

  return item
}

module.exports = {
  addToCache,
  checkCache,
  parsePlaylist,
  validateStatus,
}
