#! /usr/bin/env node

require('colors')
const helper = require('./helper')
const fs = require('fs')
const argv = require('commander')
const ProgressBar = require('progress')
const dateFormat = require('dateformat')
const { version } = require('../package.json')
let seedFile

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
  .option('-a, --user-agent <user-agent>', 'Set custom HTTP User-Agent')
  .option('-k, --insecure', 'Allow insecure connections when using SSL')
  .option('-d, --debug', 'Toggle debug mode')
  .action(function (file = null) {
    seedFile = file
  })
  .parse(process.argv)

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = !+argv.insecure

const outputDir =
  argv.output || `iptv-checker-${dateFormat(new Date(), 'd-m-yyyy-hh-MM-ss')}`
const onlineFile = `${outputDir}/online.m3u`
const offlineFile = `${outputDir}/offline.m3u`
const duplicatesFile = `${outputDir}/duplicates.m3u`

const config = {
  debug: argv.debug,
  insecure: argv.insecure,
  userAgent: argv.userAgent,
  timeout: parseInt(argv.timeout),
}

const debugLogger = helper.debugLogger(config.debug)

debugLogger('Configuration:', config)

try {
  fs.lstatSync(outputDir)
} catch (e) {
  fs.mkdirSync(outputDir)
}

fs.writeFileSync(onlineFile, '#EXTM3U\n')
fs.writeFileSync(offlineFile, '#EXTM3U\n')
fs.writeFileSync(duplicatesFile, '#EXTM3U\n')

let bar
let stats = {
  total: 0,
  online: 0,
  offline: 0,
  duplicates: 0,
}

init()

async function init() {
  try {
    console.time('Execution time')

    let playlist = await helper.parsePlaylist(seedFile)

    stats.total = playlist.items.length

    debugLogger(`Checking ${stats.total} items...`)

    bar = new ProgressBar(':bar', { total: stats.total })

    for (let item of playlist.items) {
      if (!config.debug) {
        bar.tick()
      }

      await validate(item)
    }

    if (config.debug) {
      console.timeEnd('Execution time')
    }

    const result = [
      `Total: ${stats.total}`,
      `Online: ${stats.online}`.green,
      `Offline: ${stats.offline}`.red,
      `Duplicates: ${stats.duplicates}`.yellow,
    ].join('\n')

    console.log(`\n${result}`)

    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

async function validate(item) {
  const result = await helper.ffprobe(item, config)

  if (result.status === helper.status.OK) {
    helper.writeToFile(onlineFile, item)

    debugLogger(`${item.url}`.green)

    stats.online++
  } else if (result.status === helper.status.DUPLICATE) {
    helper.writeToFile(duplicatesFile, item)

    debugLogger(`${item.url} (Duplicate)`.yellow)

    stats.duplicates++
  } else if (result.status === helper.status.FAILED) {
    helper.writeToFile(offlineFile, item, result.message)

    debugLogger(`${item.url} (${result.message})`.red)

    stats.offline++
  }
}
