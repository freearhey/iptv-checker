import { IPTVChecker } from '../src/index.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe } from '@jest/globals'

import expectedResults from './__data__/expected/results/index.js'

let checker
beforeEach(() => {
  checker = new IPTVChecker()
})

describe('checkPlaylist', () => {
  it(`should process a relative playlist file path`, async () => {
    const path = 'tests/__data__/input/simple.m3u'
    const results = await checker.checkPlaylist(path)

    expect(results).toMatchObject(expectedResults.playlists.simple)
  })

  it(`should process an absolute playlist file path`, async () => {
    const path = resolve('tests/__data__/input/simple.m3u')
    const results = await checker.checkPlaylist(path)

    expect(results).toMatchObject(expectedResults.playlists.simple)
  })

  it(`should process a playlist URL`, async () => {
    const url = 'https://example.com/simple.m3u'
    const results = await checker.checkPlaylist(url)

    expect(results).toMatchObject(expectedResults.playlists.simple)
  })

  it(`should process a playlist data Buffer`, async () => {
    const playlist = readFileSync(resolve('tests/__data__/input/simple.m3u'), 'utf8')
    const buffer = Buffer.from(playlist)
    const results = await checker.checkPlaylist(buffer)

    expect(results).toMatchObject(expectedResults.playlists.simple)
  })

  it(`should process a playlist data string`, async () => {
    const playlist = readFileSync(resolve('tests/__data__/input/simple.m3u'), 'utf8')
    const results = await checker.checkPlaylist(playlist)

    expect(results).toMatchObject(expectedResults.playlists.simple)
  })

  it(`should throw with invalid input`, async () => {
    await expect(checker.checkPlaylist(1)).rejects.toThrow('Unsupported input type')
  })

  it(`should throw with invalid file path`, async () => {
    const path = 'tests/__data__/input/missing.m3u'
    await expect(checker.checkPlaylist(path)).rejects.toThrow('Unable to parse a playlist')
  })

  it(`should throw on URL fetch failure`, async () => {
    await expect(checker.checkPlaylist(`https://www.google.com/teapot`)).rejects.toThrow(
      'Error fetching playlist'
    )
  })

  it(`should throw on invalid fetched input data`, async () => {
    await expect(checker.checkPlaylist(`https://github.com`)).rejects.toThrow(
      'URL is not an M3U playlist file'
    )
  })

  it(`should process a playlist with rtp link`, async () => {
    const path = 'tests/__data__/input/rtp.m3u'
    const results = await checker.checkPlaylist(path)

    expect(results).toMatchObject(expectedResults.playlists.rtp)
  })

  it(`should process a playlist with duplicates`, async () => {
    const path = 'tests/__data__/input/duplicates.m3u'
    const results = await checker.checkPlaylist(path)

    expect(results).toMatchObject(expectedResults.playlists.duplicates)
  })
})

describe('checkStream', () => {
  it(`should process a stream URL`, async () => {
    const url = 'https://30a-tv.com/feeds/vidaa/cars.m3u8'
    const results = await checker.checkStream(url)

    expect(results).toMatchObject(
      expectedResults.streams['https://30a-tv.com/feeds/vidaa/cars.m3u8']
    )
  })

  it(`should throw with invalid input`, async () => {
    await expect(checker.checkStream(1)).rejects.toThrow('Unsupported input type')
  })
})
