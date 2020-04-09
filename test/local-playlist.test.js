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

test(`Should process a local playlist file`, t => {
  mkdirp.sync(`${pwd}/tmp/file`)
  del.sync([`${pwd}/tmp/file/*.m3u`])

  let result = execSync(
    `node ${pwd}/src/index.js -t 1000 -o ${pwd}/tmp/file ${pwd}/test/dummy.m3u`
  )
  t.true(resultTester(result), `Local playlist was processed`)
})
