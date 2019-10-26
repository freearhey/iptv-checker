#! /usr/bin/env node

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const helper = require('./helper')
const fs = require("fs")
const argv = require('commander')
const ProgressBar = require('progress')
const dateFormat = require('dateformat')
const ffmpeg = require('fluent-ffmpeg')

let seedFile

argv
  .version('0.11.2', '-v, --version')
  .usage('[options] <file>')
  .option('-o, --output [output]', 'Path to output file')
  .option('-t, --timeout [timeout]', 'Set the number of milliseconds for each request', 60000)
  .option('--debug', 'Toggle debug mode')
  .action(function (file) {
    seedFile = file
  })
  .parse(process.argv)

const outputDir = argv.output || `iptv-checker-${dateFormat(new Date(), 'd-m-yyyy-hh-MM-ss')}`
const onlineFile = `${outputDir}/online.m3u`
const offlineFile = `${outputDir}/offline.m3u`
const duplicatesFile = `${outputDir}/duplicates.m3u`

const config = {
  debug: argv.debug,
  timeout: parseInt(argv.timeout)
}

if(config.debug) {
  console.log('Configuration:', config)
}

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
  duplicates: 0
}

init()

async function init() 
{
  console.time('Execution time')

  let playlist = helper.parsePlaylist(seedFile)

  stats.total = playlist.items.length
  
  bar = new ProgressBar(':bar', { total: stats.total })

  for(let item of playlist.items) {

    if(!config.debug) {
      bar.tick()
    }

    if(!item.url) continue

    if(helper.checkCache(item.url)) {

      helper.writeToFile(duplicatesFile, item)

      stats.duplicates++

      continue

    }
      
    helper.addToCache(item.url)

    await check(item, item.url)

  }

  if(config.debug) {
    console.timeEnd('Execution time')
  }

  console.log(`Total: ${stats.total}. Online: ${stats.online}. Offline: ${stats.offline}. Duplicates: ${stats.duplicates}.`)

  process.exit(0)
}

async function check(parent, currentUrl) {

  return new Promise(async (resolve, reject) => {

    if(config.debug) {
      console.log('Checking', currentUrl)
    }

    const timeout = setTimeout(() => {
      const message = `Timeout exceeded`

      helper.writeToFile(offlineFile, parent, message)

      if(config.debug) {
        console.log(message)
      }

      stats.offline++

      resolve()
    }, config.timeout)

    ffmpeg(currentUrl, { timeout: parseInt(config.timeout / 1000) }).ffprobe(async function(err, metadata) {
      
      if(err) {

        const message = helper.parseMessage(err, currentUrl)

        helper.writeToFile(offlineFile, parent, message)

        if(config.debug) {
          console.log(message)
        }

        stats.offline++

      } else {

        helper.writeToFile(onlineFile, parent)

        stats.online++

      }

      clearTimeout(timeout)

      resolve()

    })

  })
}
