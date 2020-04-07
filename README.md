# IPTV Checker

Node.js CLI tool for checking links in IPTV playlists.

## Installation

This tool is based on the `ffmpeg` library, so you need to install it on your computer first. You can find the right installer for your system here: https://www.ffmpeg.org/download.html

After that you can install the tool itself via npm:

```sh
npm install -g iptv-checker
```

## Usage

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
- `-s, --singular`: check only one channel at a time (instead of batches of channels in parallel)
- `-d, --debug`: display verbose channel processing info

## Contribution

If you find a bug or want to contribute to the code or documentation, you can help by submitting an [issue](https://github.com/freearhey/iptv-checker/issues) or a [pull request](https://github.com/freearhey/iptv-checker/pulls).

## License

[MIT](http://opensource.org/licenses/MIT)
