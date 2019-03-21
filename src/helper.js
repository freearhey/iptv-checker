const parser = require('url')
const { URL } = parser

function createUrl(base, path) {
  let link = new URL(path, base)

  return link.href
}

function getUrlPath(u) {
  let parsedUrl = parser.parse(u)
  let searchQuery = parsedUrl.search || ''

  return parsedUrl.host + parsedUrl.pathname + searchQuery
}

module.exports = {
  createUrl,
  getUrlPath
}