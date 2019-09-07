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
  .version('0.7.0', '-v, --version')
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
const timeout = argv.timeout || 1000
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
  })
})

let total = 0
let online = 0
let offline = 0
let duplicates = 0
let bar

init()

async function init() 
{
  console.time('Execution time')

  const content = helper.readFile(seedFile)

  let playlist = helper.parsePlaylist(content)

  total = playlist.items.length
  
  bar = new ProgressBar(':bar', { total })

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

      duplicates++

      continue

    }
      
    helper.addToCache(channel.url)
    
    await parse(channel, channel.url)
  
  }

  if(debug) {

    console.timeEnd('Execution time')

  }

  console.log(`Total: ${total}. Online: ${online}. Offline: ${offline}. Duplicates: ${duplicates}.`)
}

async function parse(parent, currentUrl) {

  if(debug) {
    console.log('Parsing ', currentUrl)
  }

  try {

    await new Promise(resolve => {
      setTimeout(resolve, delay)
    })

    await instance.get(currentUrl)

    helper.writeToFile(onlineFile, parent.getInfo(), parent.url)

    online++

  } catch(e) {

    if(e.response) {
      helper.writeToFile(offlineFile, parent.getInfo() + ' (HTTP response error: ' + e.message + ')', parent.url)

      offline++
    } else if(e.request && ['ECONNABORTED'].indexOf(e.code) === -1) {
      helper.writeToFile(offlineFile, parent.getInfo() + ' (HTTP request error: ' + e.message + ' with status code ' + e.code + ')', parent.url)

      offline++
    } else {
      helper.writeToFile(onlineFile, parent.getInfo(), parent.url)

      online++
    }

  }
}
