const Axios = require('axios')
const fs = require('fs')
const parser = require('iptv-playlist-parser')
const urlParser = require('url')
const getStdin = require('get-stdin')
const { isWebUri } = require('valid-url')
const util = require('util')
const execAsync = util.promisify(require('child_process').exec)

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

  result.items = result.items.filter(i => isWebUri(i.url))

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

function parseMessage(reason, url) {
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

const debugLogger = (dbg = false) => {
  if (!dbg) return () => {}
  return (...args) => console.log(...args)
}

function isJSON(str) {
  try {
    return !!JSON.parse(str)
  } catch (e) {
    return false
  }
}

async function validateItem(item) {
  const { url } = item
  const { userAgent, timeout } = this
  if (!isWebUri(url)) {
    return { ok: false, reason: `Invalid web URI: ${url}` }
  }

  return await execAsync(
    `ffprobe -of json -v error -hide_banner -show_format -show_streams ${
      userAgent ? `-user_agent "${userAgent}"` : ``
    } ${url}`,
    { timeout }
  )
    .then(({ stdout }) => {
      if (!isJSON(stdout)) {
        return { ok: false, reason: stdout }
      }
      const metadata = JSON.parse(stdout)
      return { ok: true, metadata }
    })
    .catch(err => ({ ok: false, reason: err.message }))
}

module.exports = {
  addToCache,
  checkCache,
  debugLogger,
  parseMessage,
  parsePlaylist,
  readFile,
  validateItem,
  writeToFile,
}
