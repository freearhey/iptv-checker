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
  .version('0.8.1', '-v, --version')
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
  headers: {
    'Accept': '*/*',
    'Accept-Language': 'en_US',
    'User-Agent': 'VLC/3.0.8 LibVLC/3.0.8',
    'Range': 'bytes=0-'
  }
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

  const content = helper.readFile(seedFile)

  let playlist = helper.parsePlaylist(content)

  stats.total = playlist.items.length
  
  bar = new ProgressBar(':bar', { total: stats.total })

  for(let item of playlist.items) {

    if(!debug) {
      bar.tick()
    }

    if(!item.inf || !item.url) continue

    const channel = helper.createChannel({
      info: item.inf,
      url: item.url
    })

    if(helper.checkCache(channel.url)) {

      helper.writeToFile(duplicatesFile, channel.getInfo(), channel.url)

      stats.duplicates++

      continue

    }
      
    helper.addToCache(channel.url)
    
    await parse(channel, channel.url)
  
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

    let string = response.data.toString()

    let head = string.slice(0,7)

    if(head === '#EXTM3U') {

      helper.writeToFile(onlineFile, parent.getInfo(), parent.url)

      stats.online++

    } else {

      helper.writeToFile(offlineFile, parent.getInfo() + ' (Parsing error: Wrong content type)', parent.url)

      stats.offline++

    }

  } catch(e) {

    if(e.response) {

      helper.writeToFile(offlineFile, parent.getInfo() + ' (HTTP response error: ' + e.message + ')', parent.url)

      stats.offline++

    } else if(e.request) {

      helper.writeToFile(offlineFile, parent.getInfo() + ' (HTTP request error: ' + e.message + ' with status code ' + e.code + ')', parent.url)

      stats.offline++

    } else {

      helper.writeToFile(offlineFile, parent.getInfo() + ' (Error: ' + e.message + ')', parent.url)

      stats.offline++
    
    }

  }
}
