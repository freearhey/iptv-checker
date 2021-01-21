const { readFileSync } = require('fs')
const test = require('ava')
const iptvChecker = require('./../src/index.js')
const playlistPath = `${__dirname}/input/dummy.m3u`
const playlistFile = readFileSync(playlistPath, {
  encoding: 'utf8',
})

function resultTester(result) {
  return result.items.every(item => {
    return (
      Reflect.has(item, `status`) &&
      Reflect.has(item.status, `ok`) &&
      (Reflect.has(item.status, `reason`) ||
        Reflect.has(item.status, `metadata`))
    )
  })
}

test(`Should process a playlist URL`, async t => {
  const url = 'https://iptv-org.github.io/iptv/categories/comedy.m3u'
  const results = await iptvChecker(url, { timeout: 2000, parallel: 1 })

  t.true(resultTester(results))
})

test(`Should process a relative playlist file path`, async t => {
  const path = 'test/input/dummy.m3u'
  const results = await iptvChecker(path, { timeout: 2000, parallel: 1 })

  t.true(resultTester(results))
})

test(`Should process an absolute playlist file path`, async t => {
  const results = await iptvChecker(playlistPath, {
    timeout: 2000,
    parallel: 1,
  })

  t.true(resultTester(results))
})

test(`Should process a playlist data Buffer`, async t => {
  const playlistBuffer = Buffer.from(playlistFile)
  const results = await iptvChecker(playlistBuffer, {
    timeout: 2000,
    parallel: 1,
  })

  t.true(resultTester(results))
})

test(`Should process a playlist data string`, async t => {
  const results = await iptvChecker(playlistFile, {
    timeout: 2000,
    parallel: 1,
  })

  t.true(resultTester(results))
})

test(`Should throw with invalid input`, async t => {
  await t.throwsAsync(() =>
    iptvChecker(1, {
      timeout: 2000,
      parallel: 1,
    })
  ),
    { instanceOf: TypeError }
})

test(`Should throw with invalid file path`, async t => {
  const badPath = `${__dirname}/input/badPath.m3u`
  await t.throwsAsync(() =>
    iptvChecker(badPath, {
      timeout: 2000,
      parallel: 1,
    })
  )
})

test(`Should throw on URL fetch failure`, async t => {
  await t.throwsAsync(() =>
    iptvChecker(`https://www.google.com/teapot`, {
      timeout: 2000,
      parallel: 1,
    })
  )
})

test(`Should throw on invalid fetched input data`, async t => {
  await t.throwsAsync(() =>
    iptvChecker(`https://github.com`, {
      timeout: 2000,
      parallel: 1,
    })
  )
})
