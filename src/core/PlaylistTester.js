import { PlaylistParser } from './PlaylistParser.js'
import { StreamTester } from './StreamTester.js'
import commandExists from 'command-exists'
import { Cache } from './Cache.js'
import { eachLimit } from 'async'
import { normalizeUrl, isUri } from './utils.js'

export class PlaylistTester {
  constructor({ logger, config }) {
    this.logger = logger
    this.config = config
    this.cache = new Cache()
    this.streamTester = new StreamTester({ logger, config, cache: this.cache })
    this.playlistParser = new PlaylistParser({ config })
  }

  async test(input) {
    this.logger.debug('PlaylistTester.test')
    this.logger.debug(input)

    await commandExists(`ffprobe`).catch(() => {
      throw new Error(`Executable "ffprobe" not found. Have you installed "ffmpeg"?`)
    })

    if (!(input instanceof Object) && !Buffer.isBuffer(input) && typeof input !== `string`) {
      throw new Error('Unsupported input type')
    }

    const playlist = await this.playlistParser.parse(input).catch(err => {
      throw new Error(err)
    })
    this.logger.debug(playlist)

    await this.config.setUp(playlist)

    let queue = []

    for (let item of playlist.items) {
      if (isUri(item.url)) {
        const itemUrlNorm = normalizeUrl(item.url)
        if (this.cache.has(itemUrlNorm)) {
          item.status = { ok: false, code: 'DUPLICATE', message: `Duplicate` }
          await this.config.afterEach(item)
        } else {
          this.cache.add(itemUrlNorm)
          queue.push(item)
        }
      } else {
        item.status = { ok: false, code: 'INVALID_URI', message: 'Invalid URI' }
        await this.config.afterEach(item)
      }
    }

    if (+this.config.parallel === 1) {
      for (let item of queue) {
        await this.streamTester.test(item)
      }
    } else {
      await eachLimit(queue, +this.config.parallel, async item => {
        await this.streamTester.test(item)
      })
    }

    this.logger.debug(playlist)

    return playlist
  }
}
