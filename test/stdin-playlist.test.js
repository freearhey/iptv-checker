const { execSync } = require('child_process')
const mkdirp = require('mkdirp')
const del = require('del')
const test = require('ava')
const pwd = `${__dirname}/..`

function resultTester(stdout) {
  return [`Total`, `Online`, `Offline`, `Duplicates`].every(val =>
    RegExp(val).test(stdout)
  )
}

test(`Should process playlist piped from stdin`, t => {
  mkdirp.sync(`${pwd}/tmp/stdin`)
  del.sync([`${pwd}/tmp/stdin/*.m3u`])

  let result = execSync(
    `cat ${pwd}/test/dummy.m3u | node ${pwd}/src/index.js -t 1000 -o ${pwd}/tmp/stdin`
  )
  t.true(resultTester(result), `Playlist from stdin was processed`)
})
