import { PlaylistLoader } from './PlaylistLoader.js'
import { existsSync, readFileSync } from 'fs'
import parser from 'iptv-playlist-parser'
import { isWebUri } from 'valid-url'

export class PlaylistParser {
  constructor({ config }) {
    this.playlistLoader = new PlaylistLoader({ config })
  }

  async parse(input) {
    if (input instanceof Object && Reflect.has(input, `items`)) return input

    let data = input
    if (Buffer.isBuffer(input)) {
      data = input.toString('utf8')
    } else if (typeof input === 'string') {
      if (isWebUri(input)) {
        data = await this.playlistLoader.load(input)
      } else if (existsSync(input)) {
        data = readFileSync(input, 'utf8')
      }
    }

    if (!data.startsWith('#EXTM3U')) {
      return Promise.reject('Unable to parse a playlist')
    }

    return parser.parse(data)
  }
}
