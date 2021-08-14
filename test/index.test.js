const { readFileSync } = require('fs')
const IPTVChecker = require('./../src/index')
const playlistPath = `${__dirname}/input/dummy.m3u`
const playlistFile = readFileSync(playlistPath, {
  encoding: 'utf8',
})
const checker = new IPTVChecker({ timeout: 2000, parallel: 1 })

function resultTester(result) {
  return result.items.every(item => {
    return (
      Reflect.has(item, `status`) &&
      Reflect.has(item.status, `ok`) &&
      (Reflect.has(item.status, `reason`) ||
        (Reflect.has(item.status, `metadata`) &&
          Reflect.has(item.status.metadata, `requests`)))
    )
  })
}

jest.setTimeout(60000)

test(`Should process a playlist URL`, async () => {
  const url = 'https://iptv-org.github.io/iptv/languages/amh.m3u'
  const results = await checker.checkPlaylist(url)

  expect(resultTester(results)).toBeTruthy()
})

test(`Should process a relative playlist file path`, async () => {
  const path = 'test/input/dummy.m3u'
  const results = await checker.checkPlaylist(path)

  expect(resultTester(results)).toBeTruthy()
})

test(`Should process an absolute playlist file path`, async () => {
  const results = await checker.checkPlaylist(playlistPath)

  expect(resultTester(results)).toBeTruthy()
})

test(`Should process a playlist data Buffer`, async () => {
  const playlistBuffer = Buffer.from(playlistFile)
  const results = await checker.checkPlaylist(playlistBuffer)

  expect(resultTester(results)).toBeTruthy()
})

test(`Should process a playlist data string`, async () => {
  const results = await checker.checkPlaylist(playlistFile)

  expect(resultTester(results)).toBeTruthy()
})

test(`Should throw with invalid input`, async () => {
  await expect(checker.checkPlaylist(1)).rejects.toThrow(
    'Unsupported input type'
  )
})

test(`Should throw with invalid file path`, async () => {
  const badPath = `${__dirname}/input/badPath.m3u`
  await expect(checker.checkPlaylist(badPath)).rejects.toThrow(
    'Playlist is not valid'
  )
})

test(`Should throw on URL fetch failure`, async () => {
  await expect(
    checker.checkPlaylist(`https://www.google.com/teapot`)
  ).rejects.toThrow('Error fetching playlist')
})

test(`Should throw on invalid fetched input data`, async () => {
  await expect(checker.checkPlaylist(`https://github.com`)).rejects.toThrow(
    'URL is not an .m3u playlist file'
  )
})
