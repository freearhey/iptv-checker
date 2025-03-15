export class Logger {
  constructor({ config }) {
    this.config = config
  }

  info(msg) {
    this.print(msg)
  }

  error(err) {
    this.print(err)
  }

  debug(msg) {
    if (this.config.debug) this.print(msg)
  }

  print(msg) {
    if (typeof msg === `object`) {
      console.log(JSON.stringify(msg, null, 1))
    } else console.log(msg)
  }
}
