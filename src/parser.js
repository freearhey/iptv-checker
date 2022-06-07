const { parse } = require('iptv-playlist-parser')
const { existsSync, readFileSync } = require('fs')
const { isWebUri } = require('valid-url')
const { loadPlaylist } = require('./http')

module.exports.parsePlaylist = parsePlaylist

async function parsePlaylist(input) {
  if (input instanceof Object && Reflect.has(input, `items`)) return input

  let data = input
  if (Buffer.isBuffer(input)) {
    data = input.toString(`utf8`)
  } else if (typeof input === `string`) {
    if (isWebUri(input)) {
      data = await loadPlaylist(input)
    } else if (existsSync(input)) {
      data = readFileSync(input, { encoding: `utf8` })
    }
  }

  if (!data.startsWith('#EXTM3U')) {
    return Promise.reject('Unable to parse a playlist')
  }

  return parse(data)
}
