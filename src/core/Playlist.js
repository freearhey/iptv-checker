import fs from 'fs'

export class Playlist {
  constructor(path) {
    this.path = path

    fs.writeFileSync(path, '#EXTM3U\r\n')
  }

  append(item) {
    const message = item?.status?.message || null
    const lines = item.raw.split('\r\n')
    const extinf = lines[0]

    if (message) {
      lines[0] = `${extinf.trim()} (${message})`
    }

    const output = `${lines.join('\r\n')}\r\n`

    fs.appendFileSync(this.path, output)
  }
}
