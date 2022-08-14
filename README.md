# IPTV Checker [![Build Status](https://app.travis-ci.com/freearhey/iptv-checker.svg?branch=master)](https://app.travis-ci.com/freearhey/iptv-checker)

Node.js CLI tool for checking links in IPTV playlists.

This tool is based on the `ffmpeg` library, so you need to install it on your computer first. You can find the right installer for your system here: https://www.ffmpeg.org/download.html

## Usage

### CLI

```sh
npm install -g iptv-checker
```

#### Check local playlist file:

```sh
iptv-checker /path-to-playlist/example.m3u
```

#### Check playlist URL:

```sh
iptv-checker https://some-playlist.lol/list.m3u
```

#### Pipe playlist from `stdin`:

```sh
cat ~/some-playlist.m3u | iptv-checker
```

Arguments:

- `-o, --output`: change default output directory
- `-t, --timeout`: specifies the number of milliseconds before the request will be aborted (default to 60000)
- `-a, --user-agent`: set custom HTTP User-Agent
- `-k, --insecure`: allow insecure connections when using SSL
- `-p, --parallel`: Batch size of channels to check concurrently (default to 1)

### Module

```sh
npm install iptv-checker
```

```js
var checker = require('iptv-checker')

// using playlist url
checker.checkPlaylist('https://some-playlist.lol/list.m3u').then(results => {
  console.log(results)
})

// using local path
checker.checkPlaylist('path/to/playlist.m3u').then(results => {
  console.log(results)
})

// using playlist as string
checker.checkPlaylist(string).then(results => {
  console.log(results)
})
```

#### Results

_On success:_

```js
{
  header: {
    attrs: {},
    raw: '#EXTM3U x-tvg-url=""'
  },
  items: [
    {
      name: 'KBSV/AssyriaSat (720p) [Not 24/7]',
      tvg: {
        id: 'KBSVAssyriaSat.us',
        name: '',
        logo: 'https://i.imgur.com/zEWSSdf.jpg',
        url: '',
        rec: ''
      },
      group: {
        title: 'General'
      },
      http: {
        referrer: '',
        'user-agent': ''
      },
      url: 'http://66.242.170.53/hls/live/temp/index.m3u8',
      raw: '#EXTINF:-1 tvg-id="KBSVAssyriaSat.us" tvg-logo="https://i.imgur.com/zEWSSdf.jpg" group-title="General",KBSV/AssyriaSat (720p) [Not 24/7]\r\nhttp://66.242.170.53/hls/live/temp/index.m3u8',
      line: 2,
      catchup: {
        type: '',
        days: '',
        source: ''
      },
      timeshift: '',
      status: {
        ok: true,
        metadata: {
          streams: [
            {
              index: 0,
              codec_name: 'h264',
              codec_long_name: 'H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10',
              profile: 'High',
              codec_type: 'video',
              codec_tag_string: '[27][0][0][0]',
              codec_tag: '0x001b',
              width: 1280,
              height: 720,
              coded_width: 1280,
              coded_height: 720,
              closed_captions: 0,
              has_b_frames: 2,
              pix_fmt: 'yuv420p',
              level: 31,
              chroma_location: 'left',
              refs: 1,
              is_avc: 'false',
              nal_length_size: '0',
              r_frame_rate: '30/1',
              avg_frame_rate: '0/0',
              time_base: '1/90000',
              start_pts: 943358850,
              start_time: '10481.765000',
              bits_per_raw_sample: '8',
              disposition: {
                default: 0,
                dub: 0,
                original: 0,
                comment: 0,
                lyrics: 0,
                karaoke: 0,
                forced: 0,
                hearing_impaired: 0,
                visual_impaired: 0,
                clean_effects: 0,
                attached_pic: 0,
                timed_thumbnails: 0
              },
              tags: {
                variant_bitrate: '400000'
              }
            },
            //...
          ],
          format: {
            filename: 'http://66.242.170.53/hls/live/temp/index.m3u8',
            nb_streams: 2,
            nb_programs: 1,
            format_name: 'hls',
            format_long_name: 'Apple HTTP Live Streaming',
            start_time: '10481.560589',
            size: '214',
            probe_score: 100
          },
          requests: [
            {
              method: 'GET',
              url: 'http://66.242.170.53/hls/live/temp/index.m3u8',
              headers: {
                'User-Agent': 'Lavf/58.76.100',
                Accept: '*/*',
                Range: 'bytes=0-',
                Connection: 'close',
                Host: '66.242.170.53',
                'Icy-MetaData': '1'
              }
            },
            //...
          ]
        }
      }
    },
    //...
  ]
}
```

_On error:_

```js
{
  header: {
    attrs: {},
    raw: '#EXTM3U x-tvg-url=""'
  },
  items: [
    {
      name: 'Addis TV (720p)',
      tvg: {
        id: 'AddisTV.et',
        name: '',
        logo: 'https://i.imgur.com/KAg6MOI.png',
        url: '',
        rec: ''
      },
      group: {
        title: ''
      },
      http: {
        referrer: '',
        'user-agent': ''
      },
      url: 'https://rrsatrtmp.tulix.tv/addis1/addis1multi.smil/playlist.m3u8',
      raw: '#EXTINF:-1 tvg-id="AddisTV.et" tvg-logo="https://i.imgur.com/KAg6MOI.png" group-title="Undefined",Addis TV (720p)\\r\\nhttps://rrsatrtmp.tulix.tv/addis1/addis1multi.smil/playlist.m3u8',
      line: 2,
      catchup: {
        type: '',
        days: '',
        source: ''
      },
      timeshift: '',
      status: {
        ok: false,
        code: 'HTTP_REQUEST_TIMEOUT',
        message: 'HTTP 408 Request Timeout',
      }
    },
    //...
  ]
}
```

### Error codes

A full list of the error codes used and their descriptions can be found [here](.readme/errors.md).

## Contribution

If you find a bug or want to contribute to the code or documentation, you can help by submitting an [issue](https://github.com/freearhey/iptv-checker/issues) or a [pull request](https://github.com/freearhey/iptv-checker/pulls).

## License

[MIT](http://opensource.org/licenses/MIT)
