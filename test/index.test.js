const { execSync } = require('child_process')
const mkdirp = require('mkdirp')
const del = require('del')
const test = require('ava')
const pwd = `${__dirname}/..`

function resultTester(stdout) {
  return [`Total`, `Online`, `Offline`, `Duplicates`].every(val => {
    return RegExp(val).test(stdout)
  })
}

test.beforeEach(() => {
  mkdirp.sync(`${pwd}/test/output`)
  del.sync([`${pwd}/test/output/*.m3u`])
})

test(`Should process playlist piped from stdin`, t => {
  const result = execSync(
    `cat ${pwd}/test/input/example.m3u | node ${pwd}/src/index.js -t 1000 -o ${pwd}/test/output`
  )

  t.true(resultTester(result))
})

test(`Should process a playlist URL`, t => {
  const url = 'https://iptv-org.github.io/iptv/categories/auto.m3u'
  const result = execSync(
    `node ${pwd}/src/index.js -t 1000 -o ${pwd}/test/output ${url}`
  )

  t.true(resultTester(result))
})

test(`Should process a local playlist file`, t => {
  const result = execSync(
    `node ${pwd}/src/index.js -t 1000 -o ${pwd}/test/output ${pwd}/test/input/example.m3u`
  )

  t.true(resultTester(result))
})
