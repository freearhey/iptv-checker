const { execSync } = require('child_process')
const mkdirp = require('mkdirp')
const del = require('del')
const test = require('ava')
const pwd = `${__dirname}/..`
const url = `https://iptv-org.github.io/iptv/categories/legislative.m3u`

function resultTester(stdout) {
  return [`Total`, `Online`, `Offline`, `Duplicates`].every(val =>
    RegExp(val).test(stdout)
  )
}

test(`Should process a playlist URL`, t => {
  mkdirp.sync(`${pwd}/tmp/url`)
  del.sync([`${pwd}/tmp/url/*.m3u`])

  let result = execSync(
    `node ${pwd}/src/index.js -t 1000 -o ${pwd}/tmp/url ${url}`
  )
  t.true(resultTester(result), `Playlist URL was processed`)
})
