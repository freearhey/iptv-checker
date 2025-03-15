import axios from 'axios'
import https from 'https'

export class PlaylistLoader {
  constructor({ config }) {
    const client = axios.create({
      method: 'GET',
      timeout: config.timeout,
      responseType: 'text',
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })

    client.interceptors.response.use(
      response => {
        const contentType = response.headers?.['content-type'] || ''
        if (!/mpegurl/.test(contentType)) {
          throw new Error('URL is not an M3U playlist file')
        }

        return response.data
      },
      () => {
        return Promise.reject('Error fetching playlist')
      }
    )

    this.client = client
  }

  load(url) {
    return this.client(url)
  }
}
