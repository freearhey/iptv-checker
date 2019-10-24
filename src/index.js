#! /usr/bin/env node

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const helper = require('./helper')
const fs = require("fs")
const argv = require('commander')
const ProgressBar = require('progress')
const dateFormat = require('dateformat')
const m3u8stream = require('m3u8stream')

let seedFile

argv
  .version('0.10.2', '-v, --version')
  .usage('[options] <file>')
  .option('-o, --output [output]', 'Path to output file')
  .option('-d, --delay [delay]', 'Set delay between each request')
  .option('--debug', 'Toggle debug mode')
  .action(function (file) {
    seedFile = file
  })
  .parse(process.argv)

const outputDir = argv.output || `iptv-checker-${dateFormat(new Date(), 'd-m-yyyy-hh-MM-ss')}`
const delay = argv.delay || 200
const debug = argv.debug
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

    if(!debug) {
      bar.tick()
    }

    if(!item.url) continue

    if(helper.checkCache(item.url)) {

      helper.writeToFile(duplicatesFile, item)

      stats.duplicates++

      continue

    }
      
    helper.addToCache(item.url)
    
    await parse(item, item.url)
  
  }

  if(debug) {

    console.timeEnd('Execution time')

  }

  console.log(`Total: ${stats.total}. Online: ${stats.online}. Offline: ${stats.offline}. Duplicates: ${stats.duplicates}.`)
}

async function parse(parent, currentUrl) {

  return new Promise((resolve, reject) => {

    if(debug) {
      console.log('Parsing', currentUrl)
    }

    const stream = m3u8stream(currentUrl, {
      requestOptions: {
        maxRetries: 0
      }
    })

    stream.on('data', (data) => {

      stream.end()
    
      helper.writeToFile(onlineFile, parent)

      stats.online++

      setTimeout(resolve, delay)

    }).on('error', (e) => {

      stream.end()

      helper.writeToFile(offlineFile, parent, e.message)

      stats.offline++

      setTimeout(resolve, delay)
    
    })

  })
}
