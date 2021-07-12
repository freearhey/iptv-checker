const { readFileSync } = require('fs')
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

jest.setTimeout(60000)

test(`Should process a playlist URL`, async () => {
  const url = 'https://iptv-org.github.io/iptv/languages/amh.m3u'
  const results = await iptvChecker(url, { timeout: 2000, parallel: 1 })

  expect(resultTester(results)).toBeTruthy()
})

test(`Should process a relative playlist file path`, async () => {
  const path = 'test/input/dummy.m3u'
  const results = await iptvChecker(path, { timeout: 2000, parallel: 1 })

  expect(resultTester(results)).toBeTruthy()
})

test(`Should process an absolute playlist file path`, async () => {
  const results = await iptvChecker(playlistPath, {
    timeout: 2000,
    parallel: 1,
  })

  expect(resultTester(results)).toBeTruthy()
})

test(`Should process a playlist data Buffer`, async () => {
  const playlistBuffer = Buffer.from(playlistFile)
  const results = await iptvChecker(playlistBuffer, {
    timeout: 2000,
    parallel: 1,
  })

  expect(resultTester(results)).toBeTruthy()
})

test(`Should process a playlist data string`, async () => {
  const results = await iptvChecker(playlistFile, {
    timeout: 2000,
    parallel: 1,
  })

  expect(resultTester(results)).toBeTruthy()
})

test(`Should throw with invalid input`, async () => {
  await expect(
    iptvChecker(1, {
      timeout: 2000,
      parallel: 1,
    })
  ).rejects.toThrow('Unsupported input type')
})

test(`Should throw with invalid file path`, async () => {
  const badPath = `${__dirname}/input/badPath.m3u`
  await expect(
    iptvChecker(badPath, {
      timeout: 2000,
      parallel: 1,
    })
  ).rejects.toThrow('Playlist is not valid')
})

test(`Should throw on URL fetch failure`, async () => {
  await expect(
    iptvChecker(`https://www.google.com/teapot`, {
      timeout: 2000,
      parallel: 1,
    })
  ).rejects.toThrow('Error fetching playlist')
})

test(`Should throw on invalid fetched input data`, async () => {
  await expect(
    iptvChecker(`https://github.com`, {
      timeout: 2000,
      parallel: 1,
    })
  ).rejects.toThrow('URL is not an .m3u playlist file')
})
