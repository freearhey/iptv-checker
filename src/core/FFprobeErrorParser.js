export class FFprobeErrorParser {
  parse(output, item) {
    const url = item.url
    const line = output.split('\n').find(l => l.startsWith(url))
    const err = line ? line.replace(`${url}: `, '') : null

    switch (err) {
      case 'Protocol not found':
        return 'FFMPEG_PROTOCOL_NOT_FOUND'
      case 'Input/output error':
        return 'FFMPEG_INPUT_OUTPUT_ERROR'
      case 'Invalid data found when processing input':
        return 'FFMPEG_INVALID_DATA'
      case 'Server returned 400 Bad Request':
        return 'HTTP_BAD_REQUEST'
      case 'Server returned 401 Unauthorized (authorization failed)':
        return 'HTTP_UNAUTHORIZED'
      case 'Server returned 403 Forbidden (access denied)':
        return 'HTTP_FORBIDDEN'
      case 'Server returned 404 Not Found':
        return 'HTTP_NOT_FOUND'
      case 'Connection refused':
        return 'HTTP_CONNECTION_REFUSED'
      case "Can't assign requested address":
        return 'HTTP_CANNOT_ASSIGN_REQUESTED_ADDRESS'
      case 'Server returned 4XX Client Error, but not one of 40{0,1,3,4}':
        return 'HTTP_4XX_CLIENT_ERROR'
    }

    return 'FFMPEG_UNDEFINED'
  }
}
