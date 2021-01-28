require('colors')
const helper = require('./helper')
const { isWebUri } = require('valid-url')
const commandExists = require('command-exists')

const procs = require('os').cpus().length - 1

let stats = {
  total: 0,
  online: 0,
  offline: 0,
  duplicates: 0,
}

const defaultConfig = {
  debug: false,
  userAgent: null,
  timeout: 60000,
  parallel: procs || 1,
  omitMetadata: false,
  useItemHttpHeaders: true,
  preCheckAction: parsedPlaylist => {}, // eslint-disable-line
  itemCallback: item => {}, // eslint-disable-line
}

module.exports = async function (input, opts = {}) {
  await commandExists(`ffprobe`).catch(() => {
    throw new Error(
      `Executable "ffprobe" not found. Have you installed "ffmpeg"?`
    )
  })

  const results = []
  const duplicates = []
  const config = { ...defaultConfig, ...opts }
  const playlist = await helper.parsePlaylist(input)
  const debugLogger = helper.debugLogger(config)

  debugLogger(config)

  const items = playlist.items
    .map(item => {
      if (!isWebUri(item.url)) return null

      if (helper.checkCache(item)) {
        duplicates.push(item)

        return null
      } else {
        helper.addToCache(item)

        return item
      }
    })
    .filter(Boolean)

  await config.preCheckAction.call(null, {
    ...playlist,
    items: [...items, ...duplicates],
  })

  stats.total = items.length + duplicates.length

  stats.duplicates = duplicates.length

  debugLogger(`Checking ${stats.total} playlist items...`)

  if (duplicates.length)
    debugLogger(`Found ${stats.duplicates} duplicates...`.yellow)

  for (let item of duplicates) {
    item.status = { ok: false, reason: `Duplicate` }
    await config.itemCallback(item)
    results.push(item)
  }

  const ctx = { config, stats, debugLogger }

  const validator = helper.validateStatus.bind(ctx)

  if (+config.parallel === 1) {
    for (let item of items) {
      const checkedItem = await validator(item)

      results.push(checkedItem)
    }
  } else {
    const chunkedItems = helper.chunk(items, +config.parallel)

    for (let [...chunk] of chunkedItems) {
      const chunkResults = await Promise.all(chunk.map(validator))
      results.push(...chunkResults)
    }
  }

  playlist.items = helper.orderBy(results, [`name`])

  if (config.omitMetadata) {
    for (let item of playlist.items) {
      delete item.status.metadata
    }
  }

  helper.statsLogger(ctx)

  return playlist
}
