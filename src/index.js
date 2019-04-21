#! /usr/bin/env node

const helper = require('./helper')
const parsers = require('playlist-parser')
const M3U = parsers.M3U
const fs = require("fs")
const axios = require('axios')
const argv = require('commander')
const ProgressBar = require('progress')
const dateFormat = require('dateformat')

let seedFile

argv
  .version('0.3.0', '-v, --version')
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
  timeout
})
instance.defaults.headers.common["User-Agent"] = "VLC/2.2.4 LibVLC/2.2.4"

let total = 0
let online = 0
let offline = 0
let duplicates = 0
let cache = {}
let bar

init()

async function init() 
{
  console.time('Execution time')

  let seedContent = fs.readFileSync(seedFile, { encoding: "utf8" })

  let seedPlaylist = M3U.parse(seedContent).filter(i => i)

  bar = new ProgressBar(':bar', { total: seedPlaylist.length })

  total = seedPlaylist.length

  for(let seedItem of seedPlaylist) {

    if(!debug) {
      bar.tick()
    }

    const seedItemTitle = (seedItem.artist) ? seedItem.length + ',' + seedItem.artist + '-' + seedItem.title : seedItem.title
    
    await parse(seedItem.file, seedItemTitle, seedItem.file)
  
  }

  if(debug) {

    console.timeEnd('Execution time')

  }

  console.log(`Total: ${total}. Online: ${online}. Offline: ${offline}. Duplicates: ${duplicates}.`)

  // console.log(cache)
}

async function parse(parent, parentTitle, url) {

  if(debug) {
    console.log('Parsing ', url)
  }

  if(checkCache(url)) {

    writeToFile(duplicatesFile, parentTitle + ' (Duplicate of ' + parent + ')', url)

    duplicates++

    return

  }

  addToCache(url)

  try {

    await new Promise(resolve => {
      setTimeout(resolve, delay)
    })

    const response = await instance.get(url)

    if(response.request.res.responseUrl) {

      url = response.request.res.responseUrl

    }

    const contentType = response.headers['content-type']

    let isValid = hasValidType(contentType)

    // console.log(contentType, isValid)

    if(isValid) {

      writeToFile(onlineFile, parentTitle, parent)

      online++

      return

    } else if(isPlaylist(contentType)) {

      let playlist = M3U.parse(response.data).filter(i => i)

      if(playlist.length) {

        let nextUrl = helper.createUrl(url, playlist[0].file)

        await parse(parent, parentTitle, nextUrl)

      }

      return

    }

    writeToFile(offlineFile, parentTitle + ' (Wrong Content-Type: ' + contentType + ')', parent)

    offline++

    return 

  } catch(e) {

    // console.log('Parsing error:', e.message)

    writeToFile(offlineFile, parentTitle + ' (HTTP Error: ' + e.message + ')', parent)

    offline++

  }
}

function hasValidType(contentType) {
  return /(video\/m2ts|video\/mp2t|video\/mp4|video\/mpeg|application\/octet-stream|text\/plain|application\/binary|text\/vnd.trolltech.linguist|video\/vnd.dlna.mpeg-tts|audio\/x-aac|audio\/aac|application\/mp2t|audio\/mpeg|audio\/mp4|video\/x-ms-asf|video\/x-mpegts|audio\/x-mpegurl|binary\/octet-stream)/i.test(contentType)
}

function isPlaylist(contentType) {
  return /(application\/vnd.apple.mpegurl|application\/x-mpegurl|application\/octet-stream|application\/vnd.apple.mpegusr|video\/basic|application\/x-mpegURL)/i.test(contentType)
}

function addToCache(url) {
  let id = helper.getUrlPath(url)

  cache[id] = true
}

function checkCache(url) {
  let id = helper.getUrlPath(url)

  return cache.hasOwnProperty(id)
}

function writeToFile(path, title, file) {
  fs.appendFileSync(path, '#EXTINF:' + title + '\n' + file + '\n')
}