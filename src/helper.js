const Axios = require('axios')
const util = require('util')
const { parse } = require('iptv-playlist-parser')
const { isWebUri } = require('valid-url')
const { existsSync, readFile } = require('fs')
const exec = require('child_process').exec
const execAsync = util.promisify(exec)
const readFileAsync = util.promisify(readFile)

let cache = new Set()

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

function parseStdout(string, item) {
  const url = item.url
  const arr = string.split('\n')

  if (arr.length === 0) return

  const line = arr.find(l => {
    return l.indexOf(url) === 0
  })

  if (!line) {
    if (/^Command failed/.test(string)) {
      return 'Operation timed out'
    }
    return 'Operation failed'
  }

  return line.replace(`${url}: `, '')
}

function checkItem(item) {
  const { config, logger } = this

  const command = buildCommand(item, config)

  logger.debug(`EXECUTING: "${command}"`)

  return execAsync(command, { timeout: config.timeout })
    .then(({ stdout }) => {
      if (stdout && isJSON(stdout)) {
        const metadata = JSON.parse(stdout)
        if (!metadata.streams.length) {
          return { ok: false, reason: 'No working streams' }
        }

        return { ok: true, metadata }
      }

      return { ok: false, reason: 'Parsing error' }
    })
    .catch(err => {
      const reason = parseStdout(err.message, item)

      return { ok: false, reason }
    })
}

function buildCommand(item, config) {
  const { url, http = {} } = item
  const { referrer = ``, 'user-agent': itemUserAgent = `` } = http
  const userAgent = itemUserAgent.length ? itemUserAgent : config.userAgent

  let args = [
    `ffprobe`,
    `-of json`,
    `-v trace`,
    `-hide_banner`,
    `-show_streams`,
  ]

  if (referrer.length) {
    args.push(`-headers`, `'Referer: ${referrer}'`)
  }

  if (userAgent) {
    args.push(`-user_agent`, `'${userAgent}'`)
  }

  args.push(`'${url}'`)

  args = args.join(` `)

  return args
}

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

function isJSON(str) {
  try {
    return !!JSON.parse(str)
  } catch (e) {
    return false
  }
}

module.exports = {
  addToCache,
  checkCache,
  parsePlaylist,
  checkItem,
}
