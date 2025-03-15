import { http, HttpResponse } from 'msw'
import fs from 'fs'

export const handlers = [
  http.get('https://30a-tv.com/feeds/vidaa/cars.m3u8', () => {
    return HttpResponse.text(
      '#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-STREAM-INF:FRAME-RATE=29.970000,AVERAGE-BANDWIDTH=210000,BANDWIDTH=240000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"\nhttps://30a-tv.com/feeds/720p/54.m3u8\n\n'
    )
  }),
  http.get('https://30a-tv.com:80/feeds/vidaa/cars.m3u8', () => {
    return HttpResponse.text(
      '#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-STREAM-INF:FRAME-RATE=29.970000,AVERAGE-BANDWIDTH=210000,BANDWIDTH=240000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"\nhttps://30a-tv.com/feeds/720p/54.m3u8\n\n'
    )
  }),
  http.get('https://example.com/simple.m3u', () => {
    return new HttpResponse(fs.readFileSync('tests/__data__/input/simple.m3u', 'utf-8'), {
      headers: {
        'content-type': 'application/x-mpegurl'
      }
    })
  }),
  http.get('https://www.google.com/teapot', () => {
    return new HttpResponse(null, {
      status: 418
    })
  }),
  http.get('https://github.com', () => {
    return HttpResponse.text('<!doctype html><html lang="en"><body></body></html>')
  }),
  http.get(
    'https://stitcher-ipv4.pluto.tv/v1/stitch/embed/hls/channel/64c109a4798def0008a6e03e/master.m3u8',
    () => {
      return new HttpResponse(null, {
        status: 400
      })
    }
  ),
  http.get(
    'https://stitcher-ipv4.pluto.tv:80/v1/stitch/embed/hls/channel/64c109a4798def0008a6e03e/master.m3u8',
    () => {
      return new HttpResponse(null, {
        status: 400
      })
    }
  ),
  http.get('http://30a-tv.com/feeds/vidaa/cars.m3u8', () => {
    return HttpResponse.text(
      '#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-STREAM-INF:FRAME-RATE=29.970000,AVERAGE-BANDWIDTH=210000,BANDWIDTH=240000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"\nhttps://30a-tv.com/feeds/720p/54.m3u8\n\n'
    )
  }),
  http.get('https://bit.ly/41Q4Cxt', () => {
    return new HttpResponse(null, {
      status: 301,
      headers: {
        Location: 'https://30a-tv.com/feeds/vidaa/cars.m3u8'
      }
    })
  })
]
