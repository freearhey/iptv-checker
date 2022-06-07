const axios = require('axios')
const util = require('util')
const { parse } = require('iptv-playlist-parser')
const { isWebUri } = require('valid-url')
const { existsSync, readFile } = require('fs')
const exec = require('child_process').exec
const execAsync = util.promisify(exec)
const readFileAsync = util.promisify(readFile)
const errors = require('./errors')
const curlirize = require('axios-curlirize')
const https = require('https')

let cache = new Set()

const playlistClient = axios.create({
  method: 'GET',
  timeout: 60000, // 60 second timeout
  responseType: 'text',
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
})
playlistClient.interceptors.response.use(
  response => {
    const { 'content-type': contentType = '' } = response.headers
    if (!/mpegurl/.test(contentType)) {
      return Promise.reject('URL is not an .m3u playlist file')
    }
    return response.data
  },
  () => {
    return Promise.reject(`Error fetching playlist`)
  }
)

const streamClient = axios.create({
  method: 'GET',
  timeout: 60000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  validateStatus: function (status) {
    return (status >= 200 && status < 400) || status === 405
  },
})
curlirize(streamClient, (result, err) => {
  const { command } = result
  console.log(`CURL: "${command}"`)
})

module.exports = {
  addToCache,
  checkCache,
  parsePlaylist,
  checkItem,
}

async function parsePlaylist(input) {
  if (input instanceof Object && Reflect.has(input, `items`)) return input

  let data = input
  if (Buffer.isBuffer(input)) {
    data = input.toString(`utf8`)
  } else if (typeof input === `string`) {
    if (isWebUri(input)) {
      data = await playlistClient(input)
    } else if (existsSync(input)) {
      data = await readFileAsync(input, { encoding: `utf8` })
    }
  }

  if (!data.startsWith('#EXTM3U')) {
    return Promise.reject('Unable to parse a playlist')
  }

  return parse(data)
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

function preflightRequest(item, config) {
  if (!/^(http|https)/.test(item.url)) return Promise.resolve()

  const userAgent =
    item.http && item.http['user-agent']
      ? item.http['user-agent']
      : config.userAgent
  const referer =
    item.http && item.http.referrer ? item.http.referrer : config.httpReferer
  const timeout = item.timeout || config.timeout

  const headers = {}
  if (userAgent) {
    headers['User-Agent'] = userAgent
  }
  if (referer) {
    headers['Referer'] = referer
  }

  return streamClient(item.url, {
    timeout,
    headers,
    curlirize: config.debug,
  })
}

function checkItem(item) {
  const { config, logger } = this

  return preflightRequest(item, config)
    .then(() => ffprobe(item, config, logger))
    .catch(err => {
      const code = parseAxiosError(err, logger)

      return {
        ok: false,
        code,
        message: errors[code],
      }
    })
}

function ffprobe(item, config, logger) {
  const command = buildCommand(item, config)
  logger.debug(`FFMPEG: "${command}"`)
  const timeout = item.timeout || config.timeout
  return execAsync(command, { timeout })
    .then(({ stdout, stderr }) => {
      if (stdout && isJSON(stdout) && stderr) {
        const metadata = JSON.parse(stdout)
        if (!metadata.streams.length) {
          return {
            ok: false,
            code: 'STREAMS_NOT_FOUND',
            message: errors['STREAMS_NOT_FOUND'],
          }
        }
        const results = parseStderr(stderr)
        metadata.requests = results.requests

        return { ok: true, code: 'OK', metadata }
      }

      return {
        ok: false,
        code: 'FFMPEG_UNKNOWN',
        message: errors['FFMPEG_UNKNOWN'],
      }
    })
    .catch(err => {
      const code = parseFFmpegError(err.message, item)

      return {
        ok: false,
        code,
        message: errors[code],
      }
    })
}

function parseStderr(stderr) {
  const requests = stderr
    .split('\r\n\n')
    .map(parseRequest)
    .filter(l => l)

  return { requests }
}

function buildCommand(item, config) {
  const userAgent =
    item.http && item.http['user-agent']
      ? item.http['user-agent']
      : config.userAgent
  const referer =
    item.http && item.http.referrer ? item.http.referrer : config.httpReferer
  const timeout = item.timeout || config.timeout
  let args = [
    `ffprobe`,
    `-of json`,
    `-v verbose`,
    `-hide_banner`,
    `-show_streams`,
    `-show_format`,
  ]

  if (timeout) {
    args.push(`-timeout`, `"${timeout * 1000}"`)
  }

  if (referer) {
    args.push(`-headers`, `"Referer: ${referer}"`)
  }

  if (userAgent) {
    args.push(`-user_agent`, `"${userAgent}"`)
  }

  args.push(`"${item.url}"`)

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

function parseHttpError(status) {
  const http = {
    400: 'HTTP_BAD_REQUEST',
    401: 'HTTP_UNAUTHORIZED',
    402: 'HTTP_PAYMENT_REQUIRED',
    403: 'HTTP_FORBIDDEN',
    404: 'HTTP_NOT_FOUND',
    405: 'HTTP_METHOD_NOT_ALLOWED',
    406: 'HTTP_NOT_ACCEPTABLE',
    407: 'HTTP_PROXY_AUTHENTICATION_REQUIRED',
    408: 'HTTP_REQUEST_TIMEOUT',
    409: 'HTTP_CONFLICT',
    410: 'HTTP_GONE',
    411: 'HTTP_LENGTH_REQUIRED',
    412: 'HTTP_PRECONDITION_FAILED',
    413: 'HTTP_REQUEST_TOO_LONG',
    414: 'HTTP_REQUEST_URI_TOO_LONG',
    415: 'HTTP_UNSUPPORTED_MEDIA_TYPE',
    416: 'HTTP_REQUESTED_RANGE_NOT_SATISFIABLE',
    417: 'HTTP_EXPECTATION_FAILED',
    418: 'HTTP_IM_A_TEAPOT',
    419: 'HTTP_INSUFFICIENT_SPACE_ON_RESOURCE',
    420: 'HTTP_METHOD_FAILURE',
    421: 'HTTP_MISDIRECTED_REQUEST',
    422: 'HTTP_UNPROCESSABLE_ENTITY',
    423: 'HTTP_LOCKED',
    424: 'HTTP_FAILED_DEPENDENCY',
    428: 'HTTP_PRECONDITION_REQUIRED',
    429: 'HTTP_TOO_MANY_REQUESTS',
    431: 'HTTP_REQUEST_HEADER_FIELDS_TOO_LARGE',
    451: 'HTTP_UNAVAILABLE_FOR_LEGAL_REASONS',
    500: 'HTTP_INTERNAL_SERVER_ERROR',
    501: 'HTTP_NOT_IMPLEMENTED',
    502: 'HTTP_BAD_GATEWAY',
    503: 'HTTP_SERVICE_UNAVAILABLE',
    504: 'HTTP_GATEWAY_TIMEOUT',
    505: 'HTTP_HTTP_VERSION_NOT_SUPPORTED',
    507: 'HTTP_INSUFFICIENT_STORAGE',
    511: 'HTTP_NETWORK_AUTHENTICATION_REQUIRED',
  }

  return http[status]
}

function parseFFmpegError(output, item) {
  const url = item.url
  const line = output.split('\n').find(l => l.startsWith(url))
  const err = line ? line.replace(`${url}: `, '') : null

  if (!err) {
    console.log('FFMPEG_PROCESS_TIMEOUT', output)
    return 'FFMPEG_PROCESS_TIMEOUT'
  }

  switch (err) {
    case 'Protocol not found':
      return 'FFMPEG_PROTOCOL_NOT_FOUND'
    case 'Input/output error':
      return 'FFMPEG_INPUT_OUTPUT_ERROR'
    case 'Invalid data found when processing input':
      return 'FFMPEG_INVALID_DATA'
    case 'Server returned 400 Bad Request':
      return 'HTTP_BAD_REQUEST'
    case 'Server returned 401 Unauthorized (authorization failed)':
      return 'HTTP_UNAUTHORIZED'
    case 'Server returned 403 Forbidden (access denied)':
      return 'HTTP_FORBIDDEN'
    case 'Server returned 404 Not Found':
      return 'HTTP_NOT_FOUND'
  }

  console.log('FFMPEG_UNDEFINED', err)

  return 'FFMPEG_UNDEFINED'
}

function parseAxiosError(err, logger) {
  if (err.response) {
    return parseHttpError(err.response.status)
  } else if (err.message.startsWith('timeout')) {
    return 'HTTP_REQUEST_TIMEOUT'
  } else if (err.message.includes('ECONNREFUSED')) {
    return 'HTTP_INTERNAL_SERVER_ERROR'
  } else if (err.message.includes('unable to verify the first certificate')) {
    return 'HTTP_INTERNAL_SERVER_ERROR'
  } else if (err.code === 'EPROTO') {
    return 'HTTP_PROTOCOL_ERROR'
  } else if (err.code === 'ENETUNREACH') {
    return 'HTTP_NETWORK_UNREACHABLE'
  } else if (err.code === 'ENOTFOUND') {
    return 'HTTP_NOT_FOUND'
  } else if (err.code === 'ECONNRESET') {
    return 'HTTP_ECONNRESET'
  } else if (err.code.startsWith('HPE')) {
    return 'HTTP_PARSE_ERROR'
  }

  console.log('HTTP_UNDEFINED', err)

  return 'HTTP_UNDEFINED'
}
