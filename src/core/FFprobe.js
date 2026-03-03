import { FFprobeCommandBuilder } from './FFprobeCommandBuilder.js'
import { FFprobeOutputParser } from './FFprobeOutputParser.js'
import { FFprobeErrorParser } from './FFprobeErrorParser.js'
import { TESTING } from '../constants.js'
import { spawn } from 'child_process'
import errors from '../errors.js'

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
        output = await spawnFiltered(command, timeout)
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

function spawnFiltered(command, timeout) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.match(/(?:[^\s"]+|"[^"]*")+/g)
    const proc = spawn(cmd, args.map(a => a.replace(/^"|"$/g, '')))

    let stdout = ''
    let stderr = ''
    let killed = false

    const timer = timeout ? setTimeout(() => {
      killed = true
      proc.kill()
      reject(Object.assign(new Error('process timeout'), { stdout, stderr }))
    }, timeout) : null

    proc.stdout.on('data', chunk => { stdout += chunk })
    proc.stderr.on('data', chunk => {
      const filtered = chunk.toString()
        .split('\n')
        .filter(line => !line.includes("Skip ('#EXT-X-"))
        .join('\n')
      stderr += filtered
    })

    proc.on('close', code => {
      if (killed) return
      if (timer) clearTimeout(timer)
      if (code !== 0) {
        reject(Object.assign(new Error(`ffprobe exited with code ${code}`), { stdout, stderr }))
      } else {
        resolve({ stdout, stderr })
      }
    })

    proc.on('error', err => {
      if (timer) clearTimeout(timer)
      reject(Object.assign(err, { stdout, stderr }))
    })
  })
}

function isJSON(str) {
  try {
    return !!JSON.parse(str)
  } catch {
    return false
  }
}