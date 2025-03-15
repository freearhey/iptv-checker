import app from '../package.json' with { type: 'json' }
import { PlaylistTester } from './core/PlaylistTester.js'
import { StreamTester } from './core/StreamTester.js'
import { server } from '../tests/__mocks__/node.js'
import { Logger } from './core/Logger.js'
import { TESTING } from './constants.js'
import { cpus } from 'os'
import 'colors'

if (TESTING) {
  server.listen()
}

const defaultConfig = {
  debug: false,
  userAgent: `IPTVChecker/${app.version} (${app.homepage})`,
  timeout: 60000,
  parallel: cpus().length,
  delay: 0,
  retry: 0,
  setUp: () => {},
  afterEach: () => {},
  beforeEach: () => {}
}

export class IPTVChecker {
  constructor(opts = {}) {
    this.config = { ...defaultConfig, ...opts }
    this.logger = new Logger({ config: this.config })
    this.playlistTester = new PlaylistTester({ logger: this.logger, config: this.config })
    this.streamTester = new StreamTester({ logger: this.logger, config: this.config })

    this.logger.debug('IPTVChecker.constructor')
    this.logger.debug(this.config)
  }

  async checkPlaylist(input) {
    return this.playlistTester.test(input)
  }

  async checkStream(item) {
    return this.streamTester.test(item)
  }
}
