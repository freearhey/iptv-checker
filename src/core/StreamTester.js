import { StreamLoader } from './StreamLoader.js'
import commandExists from 'command-exists'
import { TESTING } from '../constants.js'
import { FFprobe } from './FFprobe.js'
import { Cache } from './Cache.js'

export class StreamTester {
  constructor({ logger, config, cache }) {
    this.cache = cache || new Cache()
    this.logger = logger
    this.config = config
    this.streamLoader = new StreamLoader({ config, logger, cache: this.cache })
    this.ffprobe = new FFprobe({ config, logger })
  }

  async test(input) {
    this.logger.debug('StreamTester.test')
    this.logger.debug(input)

    if (!(input instanceof Object) && typeof input !== `string`) {
      throw new Error('Unsupported input type')
    }

    let item = typeof input === 'string' ? { url: input } : input

    await commandExists(`ffprobe`).catch(() => {
      throw new Error(`Executable "ffprobe" not found. Have you installed it?`)
    })

    if (!TESTING) await wait(+this.config.delay)

    await this.config.beforeEach(item)

    try {
      await this.streamLoader.load(item)
      item.status = await this.ffprobe.check(item)
    } catch (status) {
      item.status = status
    }

    await this.config.afterEach(item)

    return item
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
