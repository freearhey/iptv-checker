import { FFprobeCommandBuilder } from './FFprobeCommandBuilder.js'
import { FFprobeOutputParser } from './FFprobeOutputParser.js'
import { FFprobeErrorParser } from './FFprobeErrorParser.js'
import { TESTING } from '../constants.js'
import { exec } from 'child_process'
import errors from '../errors.js'
import util from 'util'

const execAsync = util.promisify(exec)

export class FFprobe {
  constructor({ config, logger }) {
    this.commandBuilder = new FFprobeCommandBuilder({ config })
    this.outputParser = new FFprobeOutputParser()
    this.errorParser = new FFprobeErrorParser()
    this.config = config
    this.logger = logger
  }

  async check(item) {
    this.logger.debug('FFprobe.check')

    const command = this.commandBuilder.build(item)
    this.logger.debug(command)

    const timeout = item.timeout || this.config.timeout

    try {
      let output = {}
      if (TESTING) {
        const ffprobeOutput = (await import('../../tests/__mocks__/ffprobe.js')).default
        output = ffprobeOutput[item.url]
      } else {
        output = await execAsync(command, { timeout })
      }

      this.logger.debug(output)

      const { stdout, stderr } = output

      if (!stdout || !isJSON(stdout) || !stderr) {
        this.logger.debug('FFMPEG_UNDEFINED')
        this.logger.debug(stdout)
        this.logger.debug(stderr)

        return {
          ok: false,
          code: 'FFMPEG_UNDEFINED',
          message: errors['FFMPEG_UNDEFINED']
        }
      }

      const metadata = this.outputParser.parse(stdout, stderr)
      if (!metadata.streams.length) {
        return {
          ok: false,
          code: 'FFMPEG_STREAMS_NOT_FOUND',
          message: errors['FFMPEG_STREAMS_NOT_FOUND']
        }
      }

      return { ok: true, code: 'OK', metadata }
    } catch (err) {
      this.logger.debug(err)

      const code = this.errorParser.parse(err.message, item)

      return {
        ok: false,
        code,
        message: errors[code]
      }
    }
  }
}

function isJSON(str) {
  try {
    return !!JSON.parse(str)
  } catch {
    return false
  }
}
