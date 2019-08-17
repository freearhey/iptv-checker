#! /usr/bin/env node

const helper = require('./helper')
const fs = require("fs")
const axios = require('axios')
const argv = require('commander')
const ProgressBar = require('progress')
const dateFormat = require('dateformat')

let seedFile

argv
  .version('0.6.1', '-v, --version')
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
const radioFile = `${outputDir}/radio.m3u`

try {
  fs.lstatSync(outputDir)
} catch (e) {
  fs.mkdirSync(outputDir)
}

fs.writeFileSync(onlineFile, '#EXTM3U\n')
fs.writeFileSync(offlineFile, '#EXTM3U\n')
fs.writeFileSync(duplicatesFile, '#EXTM3U\n')
fs.writeFileSync(radioFile, '#EXTM3U\n')

let instance = axios.create({ 
  timeout
})
instance.defaults.headers.common["User-Agent"] = "VLC/2.2.4 LibVLC/2.2.4"

let total = 0
let online = 0
let offline = 0
let duplicates = 0
let radio = 0
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
    
    await parse(channel, channel.url)
  
  }

  if(debug) {

    console.timeEnd('Execution time')

  }

  console.log(`Total: ${total}. Online: ${online}. Offline: ${offline}. Duplicates: ${duplicates}. Radio: ${radio}`)
}

async function parse(parent, currentUrl) {

  if(debug) {
    console.log('Parsing ', currentUrl)
  }

  if(helper.checkCache(currentUrl)) {

    helper.writeToFile(duplicatesFile, parent.getInfo() + ' (Duplicate of ' + parent.url + ')', currentUrl)

    duplicates++

    return

  }

  helper.addToCache(currentUrl)

  if(parent.url.indexOf('rtmp://') > -1) {
    helper.writeToFile(onlineFile, parent.getInfo(), parent.url)

    online++

    return
  }

  try {

    await new Promise(resolve => {
      setTimeout(resolve, delay)
    })

    const response = await instance.get(currentUrl)

    if(response.request.res.responseUrl) {

      currentUrl = response.request.res.responseUrl

    }

    const contentType = response.headers['content-type']

    if(helper.isVideo(contentType)) {

      helper.writeToFile(onlineFile, parent.getInfo(), parent.url)

      online++

      return

    } else if(helper.isAudio(contentType)) {

      helper.writeToFile(radioFile, parent.getInfo(), parent.url)

      radio++

      return

    } else if(helper.isPlaylist(contentType)) {

      let playlist = helper.parsePlaylist(response.data)

      if(playlist.items.length) {

        let nextUrl = helper.createUrl(currentUrl, playlist.items[0].url)

        await parse(parent, nextUrl)

      } else {

        helper.writeToFile(offlineFile, parent.getInfo() + ' (Empty playlist)', parent.url)

        offline++

      }

      return

    }

    helper.writeToFile(offlineFile, parent.getInfo() + ' (Wrong Content-Type: ' + contentType + ')', parent.url)

    offline++

    return 

  } catch(e) {

    helper.writeToFile(offlineFile, parent.getInfo() + ' (HTTP Error: ' + e.message + ')', parent.url)

    offline++

  }
}
