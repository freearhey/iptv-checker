#! /usr/bin/env node

import app from '../package.json' with { type: 'json' }
import { Playlist } from '../src/core/Playlist.js'
import { Logger } from '../src/core/Logger.js'
import { IPTVChecker } from '../src/index.js'
import dateFormat from 'dateformat'
import { program } from 'commander'
import ProgressBar from 'progress'
import getStdin from 'get-stdin'
import { cpus } from 'os'
import fs from 'fs'

let stdin

program
  .version(app.version, '-v, --version')
  .name('iptv-checker')
  .description('Utility to check M3U playlists entries')
  .usage('[options] [file|url]')
  .option(
    '-o, --output <dir>',
    'Path to output directory',
    `iptv-checker_${dateFormat(new Date(), 'yyyymmddhhMMss')}`
  )
  .option('-t, --timeout <number>', 'Set the number of milliseconds for each request', 60000)
  .option('-d, --delay <number>', 'Set delay between requests in milliseconds', 0)
  .option('-r, --retry <number>', 'Set the number of retries for failed requests', 0)
  .option('-p, --parallel <number>', 'Batch size of items to check concurrently', cpus().length)
  .option(
    '-a, --user-agent <string>',
    'Set custom HTTP User-Agent',
    `IPTVChecker/${app.version} (${app.homepage})`
  )
  .option('-x, --proxy <url>', 'Set HTTP proxy to tunnel through')
  .option('-k, --insecure', 'Allow insecure connections when using SSL')
  .option('-D, --debug', 'Enable debug mode')
  .action((str = null) => {
    stdin = str
  })
  .argument('[file|url]', 'Path to the file or url')
  .parse(process.argv)

const options = program.opts()

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = !+options.insecure

const config = {
  debug: options.debug || false,
  insecure: options.insecure,
  userAgent: options.userAgent,
  proxy: options.proxy,
  timeout: parseInt(options.timeout),
  parallel: +options.parallel,
  delay: +options.delay,
  retry: +options.retry,
  setUp,
  afterEach
}

let bar
const stats = {
  total: 0,
  online: 0,
  offline: 0,
  duplicates: 0
}

const outputDir = options.output
try {
  fs.lstatSync(outputDir)
} catch (e) {
  fs.mkdirSync(outputDir)
}

const onlinePlaylist = new Playlist(`${outputDir}/online.m3u`)
const offlinePlaylist = new Playlist(`${outputDir}/offline.m3u`)
const duplicatesPlaylist = new Playlist(`${outputDir}/duplicates.m3u`)

init()

async function init() {
  const logger = new Logger(config)

  try {
    if (!stdin || !stdin.length) stdin = await getStdin()

    const checker = new IPTVChecker(config)
    const checked = await checker.checkPlaylist(stdin)

    stats.online = checked.items.filter(item => item.status.ok).length
    stats.offline = checked.items.filter(
      item => !item.status.ok && item.status.code !== `DUPLICATE`
    ).length
    stats.duplicates = checked.items.filter(
      item => !item.status.ok && item.status.code === `DUPLICATE`
    ).length

    const result = [
      `Total: ${stats.total}`,
      `Online: ${stats.online}`.green,
      `Offline: ${stats.offline}`.red,
      `Duplicates: ${stats.duplicates}`.yellow
    ].join('\n')

    logger.info(`\n${result}`)
    process.exit(0)
  } catch (err) {
    logger.error(err.message)
    process.exit(1)
  }
}

function afterEach(item) {
  if (item.status.ok) {
    onlinePlaylist.append(item)
  } else if (item.status.code === `DUPLICATE`) {
    duplicatesPlaylist.append(item)
  } else {
    offlinePlaylist.append(item)
  }

  if (!config.debug) {
    bar.tick()
  }
}

function setUp(playlist) {
  stats.total = playlist.items.length
  bar = new ProgressBar('[:bar] :current/:total (:percent) ', {
    total: stats.total
  })
}
