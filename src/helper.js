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

function parseError(output, item) {
  const url = item.url
  const line = output.split('\n').find(l => {
    return l.indexOf(url) === 0
  })

  if (!line) {
    return 'Operation timed out'
  }

  return line.replace(`${url}: `, '')
}

function parseStderr(stderr) {
  const requests = stderr
    .split('\r\n\n')
    .map(parseRequest)
    .filter(l => l)

  return { requests }
}

function parseRequest(string) {
  const urlMatch = string.match(/Opening '(.*)' for reading/)
  const url = urlMatch ? urlMatch[1] : null
  if (!url) return null
  const requestMatch = string.match(/request: (.|[\r\n])+/gm)
  const request = requestMatch ? requestMatch[0] : null
  if (!request) return null
  const arr = request
    .split('\n')
    .map(l => l.trim())
    .filter(l => l)
  const methodMatch = arr[0].match(/request: (GET|POST)/)
  const method = methodMatch ? methodMatch[1] : null
  arr.shift()
  if (!arr) return null
  const headers = {}
  arr.forEach(line => {
    const parts = line.split(': ')
    if (parts && parts[1]) {
      headers[parts[0]] = parts[1]
    }
  })

  return { method, url, headers }
}

function checkItem(item) {
  const { config, logger } = this

  const command = buildCommand(item, config)

  logger.debug(`EXECUTING: "${command}"`)

  return execAsync(command, { timeout: config.timeout })
    .then(({ stdout, stderr }) => {
      if (stdout && isJSON(stdout) && stderr) {
        const metadata = JSON.parse(stdout)
        if (!metadata.streams.length) {
          return { ok: false, reason: 'No streams found' }
        }
        const results = parseStderr(stderr)
        metadata.requests = results.requests

        return { ok: true, metadata }
      }

      return { ok: false, reason: 'Parsing error' }
    })
    .catch(err => {
      const reason = parseError(err.message, item)

      return { ok: false, reason }
    })
}

function buildCommand(item, config) {
  const userAgent = item.http['user-agent'] || config.userAgent
  let args = [
    `ffprobe`,
    `-of json`,
    `-v debug`,
    `-hide_banner`,
    `-show_streams`,
    `-show_format`,
  ]

  if (config.timeout) {
    args.push(`-timeout`, `'${config.timeout * 1000}'`)
  }

  if (item.http.referrer) {
    args.push(`-headers`, `'Referer: ${item.http.referrer}'`)
  }

  if (userAgent) {
    args.push(`-user_agent`, `'${userAgent}'`)
  }

  args.push(`'${item.url}'`)

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
