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

### Node.js

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

On success:

```jsonc
{
  "header":{
    "attrs":{
      
    },
    "raw":"#EXTM3U x-tvg-url=\"\""
  },
  "items":[
    {
      "name":"Addis TV (720p)",
      "tvg":{
        "id":"AddisTV.et",
        "name":"",
        "language":"Amharic",
        "country":"ET",
        "logo":"https://i.imgur.com/KAg6MOI.png",
        "url":"",
        "rec":""
      },
      "group":{
        "title":""
      },
      "http":{
        "referrer":"",
        "user-agent":""
      },
      "url":"https://rrsatrtmp.tulix.tv/addis1/addis1multi.smil/playlist.m3u8",
      "raw":"#EXTINF:-1 tvg-id=\"AddisTV.et\" tvg-country=\"ET\" tvg-language=\"Amharic\" tvg-logo=\"https://i.imgur.com/KAg6MOI.png\" group-title=\"Undefined\",Addis TV (720p)\\r\\nhttps://rrsatrtmp.tulix.tv/addis1/addis1multi.smil/playlist.m3u8",
      "line":2,
      "catchup":{
        "type":"",
        "days":"",
        "source":""
      },
      "timeshift":"",
      "status":{
        "ok":false,
        "reason":"Operation timed out"
      }
    },
    //...
  ]
}
```

On error:

```jsonc
{
  "header":{
    "attrs":{
      
    },
    "raw":"#EXTM3U x-tvg-url=\"\""
  },
  "items":[
    {
      "name":"Addis TV (720p)",
      "tvg":{
        "id":"AddisTV.et",
        "name":"",
        "language":"Amharic",
        "country":"ET",
        "logo":"https://i.imgur.com/KAg6MOI.png",
        "url":"",
        "rec":""
      },
      "group":{
        "title":""
      },
      "http":{
        "referrer":"",
        "user-agent":""
      },
      "url":"https://rrsatrtmp.tulix.tv/addis1/addis1multi.smil/playlist.m3u8",
      "raw":"#EXTINF:-1 tvg-id=\"AddisTV.et\" tvg-country=\"ET\" tvg-language=\"Amharic\" tvg-logo=\"https://i.imgur.com/KAg6MOI.png\" group-title=\"Undefined\",Addis TV (720p)\\r\\nhttps://rrsatrtmp.tulix.tv/addis1/addis1multi.smil/playlist.m3u8",
      "line":2,
      "catchup":{
        "type":"",
        "days":"",
        "source":""
      },
      "timeshift":"",
      "status":{
        "ok":false,
        "reason":"Operation timed out"
      }
    },
    //...
  ]
}
```

## Contribution

If you find a bug or want to contribute to the code or documentation, you can help by submitting an [issue](https://github.com/freearhey/iptv-checker/issues) or a [pull request](https://github.com/freearhey/iptv-checker/pulls).

## License

[MIT](http://opensource.org/licenses/MIT)
