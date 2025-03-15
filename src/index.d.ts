import { Playlist, PlaylistItem, PlaylistHeader, PlaylistItemTvg } from 'iptv-playlist-parser'

export declare type IPTVCheckerOptions = {
  debug?: Boolean
  userAgent?: string
  timeout?: number
  parallel?: number
  delay?: number
  retry?: number
  setUp?: () => Promise<void> | void
  afterEach?: () => Promise<void> | void
  beforeEach?: () => Promise<void> | void
}

export interface PlaylistItemWithStatus extends PlaylistItem {
  status:
    | {
        ok: boolean
        code: string
        message: string
      }
    | {
        ok: boolean
        code: string
        metadata: {
          streams: any[]
          format: any
          requests: any[]
        }
      }
}

export interface PlaylistWithStatus {
  header: PlaylistHeader
  items: PlaylistItemWithStatus[]
}

export interface StreamWithStatus {
  url: string
  status:
    | {
        ok: boolean
        code: string
        message: string
      }
    | {
        ok: boolean
        code: string
        metadata: {
          streams: any[]
          format: any
          requests: any[]
        }
      }
}

export interface Stream {
  name?: string
  tvg?: PlaylistItemTvg
  group?: {
    title: string
  }
  http?: {
    referrer: string
    'user-agent': string
  }
  url: string
  raw?: string
  line?: number
  timeshift?: string
  catchup?: {
    type: string
    source: string
    days: string
  }
  lang?: string
}

export declare class IPTVChecker {
  constructor(opts?: IPTVCheckerOptions)
  checkPlaylist(input: Playlist): Promise<PlaylistWithStatus>
  checkStream(input: string | Stream): Promise<StreamWithStatus>
}
