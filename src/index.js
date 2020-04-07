#! /usr/bin/env node

require('colors')
const helper = require('./helper')
const fs = require('fs')
const argv = require('commander')
const ProgressBar = require('progress')
const dateFormat = require('dateformat')
const ffmpeg = require('fluent-ffmpeg')
const chunkify = require('lodash.chunk')
const { version } = require('../package.json')
const cores = require('os').cpus().length
let seedFile

argv
  .version(version, '-v, --version')
  .name('iptv-checker')
  .description(
    'Utility to check .m3u playlists entries. If no file path or url is provided, this program will attempt to read stdin'
  )
  .usage('[options] [file-or-url]')
  .option('-o, --output [output]', 'Path to output directory')
  .option(
    '-t, --timeout [timeout]',
    'Set the number of milliseconds for each request',
    60000
  )
  .option(
    '-s, --singular',
    'Disable parallel processing of multiple channels',
    false
  )
  .option('-k, --insecure', 'Allow insecure connections when using SSL', false)
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

    bar = new ProgressBar(':bar', { total: stats.total })

    for (let chunk of chunkify(playlist.items, argv.singular ? 1 : cores - 1)) {
      await Promise.all(chunk.map(processItem))
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

    console.log(result)

    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const ticker = () => !config.debug && bar.tick()

async function processItem(item, index = 0) {
  if (!item.url) {
    return ticker()
  }

  /*
     Add slight delay to ensure cache accuracy
     when processing channels concurrently
  */
  await helper.sleep(index * 100)

  if (helper.checkCache(item.url)) {
    helper.writeToFile(duplicatesFile, item)

    stats.duplicates++

    return ticker()
  }

  helper.addToCache(item.url)

  await check(item, item.url).then(ticker)
}

function check(parent, currentUrl) {
  debugLogger(`Checking ${currentUrl}`.green)
  return new Promise(resolve => {
    let timeout = setTimeout(validateOffline, config.timeout)

    ffmpeg(currentUrl, {
      timeout: parseInt(config.timeout / 1000) + 1,
    }).ffprobe(err => {
      if (err) {
        const message = helper.parseMessage(err, currentUrl)

        helper.writeToFile(offlineFile, parent, message)

        debugLogger(`${message}: ${currentUrl}`.red)

        stats.offline++
      } else {
        helper.writeToFile(onlineFile, parent)

        stats.online++
      }
      resolve(clearTimeout(timeout))
    })

    function validateOffline() {
      const message = `Timeout exceeded: ${currentUrl}`.yellow

      helper.writeToFile(offlineFile, parent, message)

      debugLogger(message)

      stats.offline++

      resolve()
    }
  })
}
