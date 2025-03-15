import { URL } from 'node:url'

export class ProxyParser {
  parse(_url) {
    const parsed = new URL(_url)

    return {
      protocol: parsed.protocol.replace(':', '') || null,
      auth: {
        username: parsed.username || null,
        password: parsed.password || null
      },
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port) : null
    }
  }
}
