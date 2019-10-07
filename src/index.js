#! /usr/bin/env node

const helper = require('./helper')
const fs = require("fs")
const axios = require('axios')
const https = require('https')
const argv = require('commander')
const ProgressBar = require('progress')
const dateFormat = require('dateformat')

let seedFile

argv
  .version('0.10.2', '-v, --version')
  .usage('[options] <file>')
  .option('-o, --output [output]', 'Path to output file')
  .option('-t, --timeout [timeout]', 'Set the number of milliseconds before the request times out')
  .option('-d, --delay [delay]', 'Set delay between each request')
  .option('--debug', 'Toggle debug mode')
  .action(function (file) {
    seedFile = file
  })
  .parse(process.argv)

const outputDir = argv.output || `iptv-checker-${dateFormat(new Date(), 'd-m-yyyy-hh-MM-ss')}`
const timeout = argv.timeout || 60000
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

let instance = axios.create({ 
  timeout,
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  }),
  validateStatus: function (status) {
    return status >= 200 && status < 400
  },
  headers: {
    'Accept': '*/*',
    'Accept-Language': 'en_US',
    'User-Agent': 'VLC/3.0.8 LibVLC/3.0.8',
    'Range': 'bytes=0-'
  },
  responseType: 'stream'
})

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

  if(debug) {
    console.log('Parsing ', currentUrl)
  }

  try {

    await new Promise(resolve => {
      setTimeout(resolve, delay)
    })

    let response = await instance.get(currentUrl)

    response.data.destroy()

    helper.writeToFile(onlineFile, parent)

    stats.online++

  } catch(e) {

    if(e.response) {

      helper.writeToFile(offlineFile, parent, 'HTTP response error: ' + e.message)

      stats.offline++

    } else if(e.request) {

      if(['ECONNRESET'].indexOf(e.code) > -1) {

        helper.writeToFile(onlineFile, parent)

        stats.online++
      
      } else {

        helper.writeToFile(offlineFile, parent, 'HTTP request error: ' + e.message + ' with status code ' + e.code)

        stats.offline++

      }

    } else {

      helper.writeToFile(offlineFile, parent, 'Error: ' + e.message)

      stats.offline++
    
    }

  }
}
