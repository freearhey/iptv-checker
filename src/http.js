const curlirize = require('axios-curlirize')
const axios = require('axios')
const https = require('https')
const errors = require('./errors')
const CancelToken = axios.CancelToken

module.exports.loadPlaylist = loadPlaylist
module.exports.loadStream = loadStream

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
      throw new Error('URL is not an M3U playlist file')
    }

    return response.data
  },
  () => {
    return Promise.reject('Error fetching playlist')
  }
)

const streamClient = axios.create({
  method: 'GET',
  timeout: 60000,
  maxContentLength: 100 * 1024,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  validateStatus: function (status) {
    return (status >= 200 && status < 400) || status === 405
  },
})

curlirize(streamClient, result => {
  const { command } = result
  console.log(`CURL: "${command}"`)
})

function loadPlaylist(url) {
  return playlistClient(url)
}

function loadStream(item, config, logger) {
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

  let source = CancelToken.source()
  setTimeout(() => {
    source.cancel('timeout')
  }, timeout)

  return streamClient(item.url, {
    timeout,
    headers,
    cancelToken: source.token,
    curlirize: config.debug,
  })
    .then(() => Promise.resolve())
    .catch(err => {
      const code = parseError(err, config, logger)
      if (code === 'HTTP_MAX_CONTENT_LENGTH_EXCEEDED') {
        return Promise.resolve()
      }

      return Promise.reject({
        ok: false,
        code,
        message: errors[code],
      })
    })
}

function parseError(err, config, logger) {
  if (err.response) {
    return parseResponseStatus(err.response.status)
  } else if (err.message && err.message.startsWith('timeout')) {
    return 'HTTP_REQUEST_TIMEOUT'
  } else if (err.message && err.message.includes('ECONNREFUSED')) {
    return 'HTTP_INTERNAL_SERVER_ERROR'
  } else if (err.message && err.message.startsWith('maxContentLength')) {
    return 'HTTP_MAX_CONTENT_LENGTH_EXCEEDED'
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

  logger.debug('HTTP_UNDEFINED')
  logger.debug(err)

  return 'HTTP_UNDEFINED'
}

function parseResponseStatus(status) {
  const codes = {
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

  return codes[status]
}
