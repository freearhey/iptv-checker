const fs = require("fs")
const parser = require('iptv-playlist-parser')
const urlParser = require('url')

let cache = {}

function getUrlPath(u) {
  let parsedUrl = urlParser.parse(u)
  let searchQuery = parsedUrl.search || ''

  return parsedUrl.host + parsedUrl.pathname + searchQuery
}

function readFile(filepath) {
  return fs.readFileSync(filepath, { encoding: "utf8" })
}

function parsePlaylist(file) {
  const content = readFile(file)
  const result = parser.parse(content)

  return result
}

function addToCache(url) {
  let id = getUrlPath(url)

  cache[id] = true
}

function checkCache(url) {
  let id = getUrlPath(url)

  return cache.hasOwnProperty(id)
}

function writeToFile(path, item, message = null) {
  const parts = item.raw.split('\n')
  let output = [
    parts[0],
    item.url
  ]

  if(message) {
    output[0] += ` (${message})`
  }

  fs.appendFileSync(path, `${output.join('\n')}\n`)
}

function parseMessage(err, u) {
  if(!err || !err.message) return

  const msgArr = err.message.split('\n')

  if(msgArr.length === 0) return

  const line = msgArr.find(line => {
    return line.indexOf(u) === 0
  })

  if(!line) return

  return line.replace(`${u}: `, '')
}

module.exports = {
  parsePlaylist,
  readFile,
  addToCache,
  checkCache,
  writeToFile,
  parseMessage
}
