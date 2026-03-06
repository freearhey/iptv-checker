import { default as _normalizeUrl } from 'normalize-url'
import { isUri as _isUri } from 'valid-url'

export function normalizeUrl(url) {
  return _normalizeUrl(url, { stripProtocol: true })
}

export function isUri(string) {
  return _isUri(encodeURI(string))
}

export function isValidUserAgent(string) {
  return /^\w+\/(\d|\.)+ \([^)]+\).*/.test(string) || /^\w+\/(\d|\.)+$/.test(string)
}
