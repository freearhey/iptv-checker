require('colors')
const chunk = require('lodash.chunk')
const { isUri } = require('valid-url')
const commandExists = require('command-exists')
const helper = require('./helper')
const Logger = require('./Logger')

const procs = require('os').cpus().length - 1

const defaultConfig = {
  debug: false,
  userAgent: null,
  timeout: 60000,
  parallel: procs || 1,
  beforeAll: playlist => {}, // eslint-disable-line
  afterEach: item => {}, // eslint-disable-line
}

module.exports = async function (input, opts = {}) {
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
  const config = { ...defaultConfig, ...opts }
  const playlist = await helper.parsePlaylist(input)
  const logger = new Logger(config)

  logger.debug({ config })

  await config.beforeAll(playlist)

  const items = playlist.items
    .map(item => {
      if (!isUri(item.url)) return null

      if (helper.checkCache(item)) {
        duplicates.push(item)

        return null
      } else {
        helper.addToCache(item)

        return item
      }
    })
    .filter(Boolean)

  for (let item of duplicates) {
    item.status = { ok: false, reason: `Duplicate` }
    await config.afterEach(item)
    results.push(item)
  }

  const ctx = { config, logger }

  const validator = helper.validateStatus.bind(ctx)

  if (+config.parallel === 1) {
    for (let item of items) {
      const checkedItem = await validator(item)

      results.push(checkedItem)
    }
  } else {
    const chunkedItems = chunk(items, +config.parallel)

    for (let [...chunk] of chunkedItems) {
      const chunkResults = await Promise.all(chunk.map(validator))
      results.push(...chunkResults)
    }
  }

  return playlist
}
