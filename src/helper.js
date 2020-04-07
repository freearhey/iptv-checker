const Axios = require('axios')
const fs = require('fs')
const parser = require('iptv-playlist-parser')
const urlParser = require('url')
const getStdin = require('get-stdin')
const { isWebUri } = require('valid-url')

let cache = new Set()

const axios = Axios.create({
  method: 'GET',
  timeout: 6e4, // 60 second timeout
  responseType: 'text',
  headers: {
    accept: 'audio/x-mpegurl',
  },
})

axios.interceptors.response.use(
  response => {
    const { 'content-type': contentType = '' } = response.headers
    if (contentType !== 'audio/x-mpegurl') {
      throw new Error('URL is not an .m3u playlist file')
    }
    return response.data
  },
  err => Promise.reject(err)
)

function getUrlPath(u) {
  let parsedUrl = urlParser.parse(u)
  let searchQuery = parsedUrl.search || ''

  return parsedUrl.host + parsedUrl.pathname + searchQuery
}

function readFile(filepath) {
  return fs.readFileSync(filepath, { encoding: 'utf8' })
}

async function parsePlaylist(fileOrUrl = ``) {
  let content
  if (!fileOrUrl.length) {
    content = await getStdin()
  } else if (isWebUri(fileOrUrl)) {
    content = await axios(fileOrUrl)
  } else {
    content = readFile(fileOrUrl)
  }
  const result = parser.parse(content)

  return result
}

function addToCache(url) {
  let id = getUrlPath(url)

  cache.add(id)
}

function checkCache(url) {
  let id = getUrlPath(url)

  return cache.has(id)
}

function writeToFile(path, item, message = null) {
  const parts = item.raw.split('\n')
  let output = [parts[0], item.url]

  if (message) {
    output[0] += ` (${message})`
  }

  fs.appendFileSync(path, `${output.join('\n')}\n`)
}

function parseMessage(err, u) {
  if (!err || !err.message) return

  const msgArr = err.message.split('\n')

  if (msgArr.length === 0) return

  const line = msgArr.find(line => {
    return line.indexOf(u) === 0
  })

  if (!line) return

  return line.replace(`${u}: `, '')
}

function sleep(ms = 60000) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const debugLogger = (dbg = false) => {
  if (!dbg) return () => {}
  return (...args) => console.log(...args)
}

module.exports = {
  addToCache,
  checkCache,
  debugLogger,
  parseMessage,
  parsePlaylist,
  readFile,
  sleep,
  writeToFile,
}
