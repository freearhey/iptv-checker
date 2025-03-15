export class FFprobeOutputParser {
  parse(stdout, stderr) {
    const metadata = JSON.parse(stdout)
    if (!metadata.streams.length) return metadata

    metadata.requests = stderr
      .split('\r\n\n')
      .map(parseRequest)
      .filter(l => l)

    return metadata
  }
}

function parseRequest(string) {
  const urlMatch = string.match(/Opening '(.*)' for reading/)
  const url = urlMatch ? urlMatch[1] : null
  if (!url) return null
  const requestMatch = string.match(/request: (.|[\r\n])+/gm)
  const request = requestMatch ? requestMatch[0] : null
  if (!request) return null
  const arr = request
    .split('\n')
    .map(l => l.trim())
    .filter(l => l)
  const methodMatch = arr[0].match(/request: (GET|POST)/)
  const method = methodMatch ? methodMatch[1] : null
  arr.shift()
  if (!arr) return null
  const headers = {}
  arr.forEach(line => {
    const parts = line.split(': ')
    if (parts && parts[1]) {
      headers[parts[0]] = parts[1]
    }
  })

  return { method, url, headers }
}
