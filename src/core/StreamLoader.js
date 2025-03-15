import { HttpErrorParser } from './HttpErrorParser.js'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { ProxyParser } from './ProxyParser.js'
import { normalizeUrl } from './utils.js'
import { TESTING } from '../constants.js'
import axiosRetry from 'axios-retry'
import errors from '../errors.js'
import axios from 'axios'
import https from 'https'

export class StreamLoader {
  constructor({ logger, config, cache }) {
    this.cache = cache
    this.config = config
    this.logger = logger
    this.httpErrorParser = new HttpErrorParser()
    this.cancelToken = axios.CancelToken

    this.logger.debug('StreamLoader.constructor')

    const client = axios.create({
      method: 'GET',
      timeout: this.config.timeout,
      maxContentLength: 100 * 1024,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      validateStatus: function (status) {
        return (status >= 200 && status < 400) || status === 405
      }
    })

    axiosRetry(client, {
      retries: this.config.retry,
      retryDelay: this.config.delay ? () => this.config.delay : axiosRetry.exponentialDelay,
      onRetry: retryCount => {
        this.logger.debug(`axiosRetry.retryCount: ${retryCount}`)
      }
    })

    this.client = client
  }

  async load(item) {
    this.logger.debug('StreamLoader.load')

    this.logger.debug('item.url')
    this.logger.debug(item.url)

    if (!/^(http|https)/.test(item.url)) return Promise.resolve()

    const timeout = item.timeout || this.config.timeout
    let source = this.cancelToken.source()
    let options = {
      timeout,
      headers: {},
      cancelToken: source.token
    }

    if (!TESTING) {
      setTimeout(() => {
        source.cancel('timeout')
      }, timeout)
    }

    const userAgent =
      item.http && item.http['user-agent'] ? item.http['user-agent'] : this.config.userAgent
    if (userAgent) {
      options.headers['User-Agent'] = userAgent
    }

    const referer = item.http && item.http.referrer ? item.http.referrer : this.config.httpReferer
    if (referer) {
      options.headers['Referer'] = referer
    }

    if (this.config.proxy) {
      const parser = new ProxyParser()
      const proxy = parser.parse(this.config.proxy)

      if (
        proxy.protocol &&
        ['socks', 'socks5', 'socks5h', 'socks4', 'socks4a'].includes(String(proxy.protocol))
      ) {
        const socksProxyAgent = new SocksProxyAgent(this.config.proxy)

        options = {
          ...options,
          ...{ httpAgent: socksProxyAgent, httpsAgent: socksProxyAgent }
        }
      } else {
        options = { ...options, ...{ proxy } }
      }
    }

    try {
      const response = await this.client(item.url, options)
      const responseUrl = response.request.res.responseUrl
      const itemUrlNorm = normalizeUrl(item.url)
      const responseUrlNorm = normalizeUrl(responseUrl)

      this.logger.debug('itemUrlNorm')
      this.logger.debug(itemUrlNorm)
      this.logger.debug('responseUrl')
      this.logger.debug(responseUrl)
      this.logger.debug('responseUrlNorm')
      this.logger.debug(responseUrlNorm)
      this.logger.debug('response.status')
      this.logger.debug(response.status)
      this.logger.debug('response.data')
      this.logger.debug(response.data)

      if (itemUrlNorm !== responseUrlNorm && this.cache.has(responseUrlNorm)) {
        return Promise.reject({ ok: false, code: 'DUPLICATE', message: `Duplicate` })
      } else {
        this.cache.add(responseUrlNorm)
      }

      return response
    } catch (err) {
      this.logger.debug(err.stack)

      const code = this.httpErrorParser.parse(err)

      if (code === 'HTTP_MAX_CONTENT_LENGTH_EXCEEDED') {
        return Promise.resolve()
      }

      return Promise.reject({
        ok: false,
        code,
        message: errors[code]
      })
    }
  }
}
