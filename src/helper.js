const fs = require("fs")
const M3U8FileParser = require('m3u8-file-parser')
const urlParser = require('url')

let cache = {}

class Channel {
  constructor(data) {
    this.info = data.info
    this.url = data.url
  }

  getInfo() {
    const duration = this.info.duration
    const title = this.info.title
    let info = this.info
    delete info.duration
    delete info.title
    let attrs = []
    for(const key in info) {
      const value = info[key]
      attrs.push(`${key}="${value}"`)
    }

    return `${duration} ${attrs.join(' ')},${title}`
  }
}

class Playlist {
  constructor(data) {
    this.attrs = data.attrs
    this.items = data.items
  }
}

function createChannel(data) {
  return new Channel({
    info: data.info,
    url: data.url
  })
}

function getUrlPath(u) {
  let parsedUrl = urlParser.parse(u)
  let searchQuery = parsedUrl.search || ''

  return parsedUrl.host + parsedUrl.pathname + searchQuery
}

function readFile(filepath) {
  return fs.readFileSync(filepath, { encoding: "utf8" })
}

function parsePlaylist(content) {
  const content = readFile(seedFile)
  const parser = new M3U8FileParser()
  parser.read(content)
  let results = parser.getResult()

  return new Playlist({
    items: results.segments
  })
}

function addToCache(url) {
  let id = getUrlPath(url)

  cache[id] = true
}

function checkCache(url) {
  let id = getUrlPath(url)

  return cache.hasOwnProperty(id)
}

function writeToFile(path, title, file) {
  fs.appendFileSync(path, '#EXTINF:' + title + '\n' + file + '\n')
}

module.exports = {
  parsePlaylist,
  createChannel,
  readFile,
  addToCache,
  checkCache,
  writeToFile
}
