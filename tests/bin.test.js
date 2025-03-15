import fs from 'fs-extra'
import { execSync } from 'child_process'

beforeEach(() => {
  fs.removeSync('tests/__data__/output')
  fs.ensureDirSync('tests/__data__/output')
})

it(`should process a local playlist file`, () => {
  execSync(`node bin/iptv-checker.js -o tests/__data__/output tests/__data__/input/simple.m3u -D`, {
    encoding: 'utf8'
  })

  expect(load('output/duplicates.m3u')).toBe(load('expected/output/simple/duplicates.m3u'))
  expect(load('output/offline.m3u')).toBe(load('expected/output/simple/offline.m3u'))
  expect(load('output/online.m3u')).toBe(load('expected/output/simple/online.m3u'))
})

it(`should process playlist piped from stdin`, () => {
  execSync(
    `cat tests/__data__/input/simple.m3u | node bin/iptv-checker.js -o tests/__data__/output`,
    { encoding: 'utf8' }
  )

  expect(load('output/duplicates.m3u')).toBe(load('expected/output/simple/duplicates.m3u'))
  expect(load('output/offline.m3u')).toBe(load('expected/output/simple/offline.m3u'))
  expect(load('output/online.m3u')).toBe(load('expected/output/simple/online.m3u'))
})

it(`should process a playlist URL`, () => {
  execSync(`node bin/iptv-checker.js -o tests/__data__/output https://example.com/simple.m3u`, {
    encoding: 'utf8'
  })

  expect(load('output/duplicates.m3u')).toBe(load('expected/output/simple/duplicates.m3u'))
  expect(load('output/offline.m3u')).toBe(load('expected/output/simple/offline.m3u'))
  expect(load('output/online.m3u')).toBe(load('expected/output/simple/online.m3u'))
})

it(`should respect proxy argument`, () => {
  execSync(
    `node bin/iptv-checker.js -o tests/__data__/output -x socks://127.0.0.1:1086 tests/__data__/input/simple.m3u`,
    { encoding: 'utf8' }
  )

  expect(load('output/duplicates.m3u')).toBe(load('expected/output/simple/duplicates.m3u'))
  expect(load('output/offline.m3u')).toBe(load('expected/output/simple/offline.m3u'))
  expect(load('output/online.m3u')).toBe(load('expected/output/simple/online.m3u'))
})

function load(filepath) {
  return fs.readFileSync(`tests/__data__/${filepath}`, 'utf-8')
}
