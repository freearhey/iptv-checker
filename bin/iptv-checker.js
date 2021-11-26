#! /usr/bin/env node

const fs = require('fs')
const argv = require('commander')
const getStdin = require('get-stdin')
const ProgressBar = require('progress')
const dateFormat = require('dateformat')
const { version, homepage } = require('../package.json')
const IPTVChecker = require('../src/index')
const Logger = require('../src/Logger')

let seedFile
let bar
const stats = {
  total: 0,
  online: 0,
  offline: 0,
  duplicates: 0,
}

argv
  .version(version, '-v, --version')
  .name('iptv-checker')
  .description(
    'Utility to check .m3u playlists entries. If no file path or url is provided, this program will attempt to read stdin'
  )
  .usage('[options] [file-or-url]')
  .option('-o, --output <output>', 'Path to output directory')
  .option(
    '-t, --timeout <timeout>',
    'Set the number of milliseconds for each request',
    60000
  )
  .option(
    '-p, --parallel <number>',
    'Batch size of items to check concurrently',
    1
  )
  .option(
    '-a, --user-agent <user-agent>',
    'Set custom HTTP User-Agent',
    `IPTVChecker/${version} (${homepage})`
  )
  .option('-k, --insecure', 'Allow insecure connections when using SSL')
  .option('-d, --debug', 'Toggle debug mode')
  .action(function (file = null) {
    seedFile = file
  })
  .parse(process.argv)

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = !+argv.insecure

const config = {
  debug: argv.debug,
  insecure: argv.insecure,
  userAgent: argv.userAgent,
  timeout: parseInt(argv.timeout),
  parallel: +argv.parallel,
  setUp,
  afterEach,
}

const logger = new Logger(config)

const outputDir =
  argv.output || `iptv-checker-${dateFormat(new Date(), 'd-m-yyyy-hh-MM-ss')}`
const onlineFile = `${outputDir}/online.m3u`
const offlineFile = `${outputDir}/offline.m3u`
const duplicatesFile = `${outputDir}/duplicates.m3u`

try {
  fs.lstatSync(outputDir)
} catch (e) {
  fs.mkdirSync(outputDir)
}

fs.writeFileSync(onlineFile, '#EXTM3U\n')
fs.writeFileSync(offlineFile, '#EXTM3U\n')
fs.writeFileSync(duplicatesFile, '#EXTM3U\n')

init()

async function init() {
  try {
    if (!seedFile || !seedFile.length) seedFile = await getStdin()

    const checker = new IPTVChecker(config)
    const checked = await checker.checkPlaylist(seedFile)

    stats.online = checked.items.filter(item => item.status.ok).length
    stats.offline = checked.items.filter(
      item => !item.status.ok && item.status.reason !== `Duplicate`
    ).length
    stats.duplicates = checked.items.filter(
      item => !item.status.ok && item.status.reason === `Duplicate`
    ).length

    const result = [
      `Total: ${stats.total}`,
      `Online: ${stats.online}`.green,
      `Offline: ${stats.offline}`.red,
      `Duplicates: ${stats.duplicates}`.yellow,
    ].join('\n')

    logger.info(`\n${result}`)
    process.exit(0)
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}

function afterEach(item) {
  if (item.status.ok) {
    writeToFile(onlineFile, item)
  } else if (item.status.reason === `Duplicate`) {
    writeToFile(duplicatesFile, item)
  } else {
    writeToFile(offlineFile, item, item.status.reason)
  }

  if (!config.debug) {
    bar.tick()
  }
}

function setUp(playlist) {
  stats.total = playlist.items.length
  bar = new ProgressBar('[:bar] :current/:total (:percent) ', {
    total: stats.total,
  })
}

function writeToFile(path, item, message = null) {
  const lines = item.raw.split('\n')
  const extinf = lines[0]

  if (message) {
    lines[0] = `${extinf.trim()} (${message})`
  }

  fs.appendFileSync(path, `${lines.join('\n')}\n`)
}
