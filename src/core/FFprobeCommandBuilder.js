export class FFprobeCommandBuilder {
  constructor({ config }) {
    this.config = config
  }

  build(item) {
    const userAgent = item?.http?.['user-agent'] ? item.http['user-agent'] : this.config.userAgent
    const referer = item?.http?.referrer ? item.http.referrer : this.config.httpReferer
    const timeout = item.timeout || this.config.timeout
    const proxy = this.config.proxy

    let args = [
      `ffprobe`,
      `-of json`,
      `-v verbose`,
      `-hide_banner`,
      `-show_streams`,
      `-show_format`
    ]

    if (timeout) {
      args.push(`-timeout`, `"${timeout * 1000}"`)
    }

    if (referer) {
      args.push(`-headers`, `"Referer: ${referer}"`)
    }

    if (userAgent) {
      args.push(`-user_agent`, `"${userAgent}"`)
    }

    if (proxy) {
      args.push('-http_proxy', `${proxy}`)
    }

    args.push(`"${item.url}"`)

    args = args.join(` `)

    return args
  }
}
