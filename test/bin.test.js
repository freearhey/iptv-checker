const { performance } = require('perf_hooks')
const { execSync } = require('child_process')
const mkdirp = require('mkdirp')
const del = require('del')
const pwd = `${__dirname}/..`

function stdoutResultTester(stdout) {
  return [`Total`, `Online`, `Offline`, `Duplicates`].every(val => {
    return RegExp(val).test(stdout)
  })
}

beforeEach(() => {
  mkdirp.sync(`${pwd}/test/output`)
  del.sync([`${pwd}/test/output/*.m3u`])
})

test(`Should process playlist piped from stdin`, () => {
  const result = execSync(
    `cat ${pwd}/test/input/example.m3u | node ${pwd}/bin/iptv-checker.js -t 1000 -o ${pwd}/test/output`,
    { encoding: 'utf8' }
  )

  expect(stdoutResultTester(result)).toBeTruthy()
})

test(`Should process a local playlist file`, () => {
  const result = execSync(
    `node ${pwd}/bin/iptv-checker.js -t 1000 -o ${pwd}/test/output ${pwd}/test/input/example.m3u`,
    { encoding: 'utf8' }
  )

  expect(stdoutResultTester(result)).toBeTruthy()
})

test(`Should process a playlist URL`, () => {
  const url = 'https://iptv-org.github.io/iptv/categories/culture.m3u'
  const result = execSync(
    `node ${pwd}/bin/iptv-checker.js -t 1000 -o ${pwd}/test/output ${url}`,
    { encoding: 'utf8' }
  )

  expect(stdoutResultTester(result)).toBeTruthy()
})

test(`Should respect timeout argument`, () => {
  let t0 = performance.now()
  execSync(
    `node ${pwd}/bin/iptv-checker.js -t 7000 -o ${pwd}/test/output ${pwd}/test/input/timeout.m3u`,
    { encoding: 'utf8' }
  )
  let t1 = performance.now()

  expect(t1 - t0).toBeGreaterThan(7000)
})
