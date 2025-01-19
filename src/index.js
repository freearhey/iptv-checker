require('colors')
const { isUri } = require('valid-url')
const commandExists = require('command-exists')
const eachLimit = require('async/eachLimit')
const { parsePlaylist } = require('./parser')
const cache = require('./cache')
const Logger = require('./Logger')
const cpus = require('os').cpus()
const { loadStream } = require('./http')
const ffprobe = require('./ffprobe')

const defaultConfig = {
  debug: false,
  userAgent: null,
  timeout: 60000,
  parallel: cpus.length,
  setUp: playlist => {}, // eslint-disable-line
  afterEach: item => {}, // eslint-disable-line
  beforeEach: item => {}, // eslint-disable-line
}

class IPTVChecker {
  constructor(opts = {}) {
    this.config = { ...defaultConfig, ...opts }
    this.logger = new Logger(this.config)
  }

  async checkPlaylist(input) {
    await commandExists(`ffprobe`).catch(() => {
      throw new Error(
        `Executable "ffprobe" not found. Have you installed "ffmpeg"?`
      )
    })

    if (
      !(input instanceof Object) &&
      !Buffer.isBuffer(input) &&
      typeof input !== `string`
    ) {
      throw new Error('Unsupported input type')
    }

    const results = []
    const duplicates = []
    const config = this.config
    const logger = this.logger

    logger.debug({ config })

    const playlist = await parsePlaylist(input).catch(err => {
      throw new Error(err)
    })

    await config.setUp(playlist)

    const items = playlist.items
      .map(item => {
        if (!isUri(item.url)) return null

        if (cache.check(item)) {
          duplicates.push(item)

          return null
        } else {
          cache.add(item)

          return item
        }
      })
      .filter(Boolean)

    for (let item of duplicates) {
      item.status = { ok: false, code: 'DUPLICATE', message: `Duplicate` }
      await config.afterEach(item)
      results.push(item)
    }

    if (+config.parallel === 1) {
      for (let item of items) {
        const checkedItem = await this.checkStream(item)

        results.push(checkedItem)
      }
    } else {
      await eachLimit(items, +config.parallel, async item => {
        const result = await this.checkStream(item)
        results.push(result)
      })
    }

    return playlist
  }

  async checkStream(item) {
    const { config, logger } = this

    await config.beforeEach(item)

    item.status = await loadStream(item, config, logger)
      .then(() => ffprobe(item, config, logger))
      .catch(status => status)

    if (item.status.ok) {
      logger.debug(`OK: ${item.url}`.green)
    } else {
      logger.debug(`FAILED: ${item.url} (${item.status.message})`.red)
    }
    logger.debug(`waiting ${config.wait} milliseconds`);
    await config.afterEach(item)
    await this.Wait();
    return item
  }

  Wait() {
    const { config } = this
    return new Promise((resolve, reject) => {
        setTimeout(()=> {
            resolve();
        },config.wait)
    })
  }
}

module.exports = IPTVChecker
