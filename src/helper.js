const Axios = require('axios')
const fs = require('fs')
const parser = require('iptv-playlist-parser')
const urlParser = require('url')
const getStdin = require('get-stdin')
const { isWebUri } = require('valid-url')
const { exec } = require('child_process')
const commandExists = require('command-exists')

commandExists(`ffprobe`).catch(() => {
  console.error(
    `Executable "ffprobe" not found. Have you installed "ffmpeg"?`.red
  )
  process.exit(1)
})

let cache = new Set()

const status = {
  OK: 0,
  FAILED: 1,
  DUPLICATE: 2,
}

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

  return parser.parse(content)
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
  const lines = item.raw.split('\n')
  const extinf = lines[0]

  if (message) {
    lines[0] = extinf + ` (${message})`
  }

  fs.appendFileSync(path, `${lines.join('\n')}\n`)
}

function parseError(msg) {
  if (msg.split('\n').filter(l => l).length > 1) {
    return msg.split(':').pop().trim()
  }

  return `Timed out`
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

function ffprobe(item, { userAgent, timeout }) {
  return new Promise(resolve => {
    const { url } = item

    if (!isWebUri(url)) {
      resolve({ status: status.FAILED, message: `Invalid URL` })
    }

    if (checkCache(url)) {
      resolve({ status: status.DUPLICATE })
    }

    addToCache(url)

    const cmd = `ffprobe -of json -v error -hide_banner -show_format -show_streams -user_agent "${userAgent}" ${url}`

    exec(cmd, { timeout }, (err, stdout) => {
      if (err) {
        resolve({ status: status.FAILED, message: parseError(err.message) })
      }

      resolve({ status: status.OK })
    })
  })
}

module.exports = {
  debugLogger,
  parsePlaylist,
  ffprobe,
  writeToFile,
  status,
}
