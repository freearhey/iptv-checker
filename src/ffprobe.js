const util = require('util')
const exec = require('child_process').exec
const execAsync = util.promisify(exec)
const errors = require('./errors')

module.exports = ffprobe

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
            code: 'FFMPEG_STREAMS_NOT_FOUND',
            message: errors['FFMPEG_STREAMS_NOT_FOUND'],
          }
        }
        const results = parseStderr(stderr)
        metadata.requests = results.requests

        return { ok: true, code: 'OK', metadata }
      }

      logger.debug('FFMPEG_UNDEFINED')
      logger.debug(stdout)
      logger.debug(stderr)

      return {
        ok: false,
        code: 'FFMPEG_UNDEFINED',
        message: errors['FFMPEG_UNDEFINED'],
      }
    })
    .catch(err => {
      const code = parseError(err.message, item, config, logger)

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

function parseError(output, item, config, logger) {
  const url = item.url
  const line = output.split('\n').find(l => l.startsWith(url))
  const err = line ? line.replace(`${url}: `, '') : null

  if (!err) {
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
    case 'Connection refused':
      return 'HTTP_CONNECTION_REFUSED'
    case "Can't assign requested address":
      return 'HTTP_CANNOT_ASSIGN_REQUESTED_ADDRESS'
    case 'Server returned 4XX Client Error, but not one of 40{0,1,3,4}':
      return 'HTTP_4XX_CLIENT_ERROR'
  }

  logger.debug('FFMPEG_UNDEFINED')
  logger.debug(err)

  return 'FFMPEG_UNDEFINED'
}

function isJSON(str) {
  try {
    return !!JSON.parse(str)
  } catch (e) {
    return false
  }
}
