export default {
  header: {
    attrs: {},
    raw: '#EXTM3U'
  },
  items: [
    {
      name: 'Example',
      tvg: {
        id: '',
        name: '',
        logo: '',
        url: '',
        rec: '',
        shift: ''
      },
      group: {
        title: ''
      },
      http: {
        referrer: '',
        'user-agent': ''
      },
      url: 'rtp://127.0.0.1:1234',
      raw: '#EXTINF:-1,Example\r\nrtp://127.0.0.1:1234',
      line: 2,
      catchup: {
        type: '',
        days: '',
        source: ''
      },
      timeshift: '',
      lang: '',
      status: {
        ok: true,
        code: 'OK',
        metadata: {
          streams: [
            {
              index: 0,
              codec_name: 'mp2',
              codec_long_name: 'MP2 (MPEG audio layer 2)',
              codec_type: 'audio',
              codec_tag_string: '[3][0][0][0]',
              codec_tag: '0x0003',
              sample_fmt: 'fltp',
              sample_rate: '44100',
              channels: 2,
              channel_layout: 'stereo',
              bits_per_sample: 0,
              initial_padding: 0,
              r_frame_rate: '0/0',
              avg_frame_rate: '0/0',
              time_base: '1/90000',
              bit_rate: '128000',
              disposition: {
                default: 0,
                dub: 0,
                original: 0,
                comment: 0,
                lyrics: 0,
                karaoke: 0,
                forced: 0,
                hearing_impaired: 0,
                visual_impaired: 0,
                clean_effects: 0,
                attached_pic: 0,
                timed_thumbnails: 0,
                non_diegetic: 0,
                captions: 0,
                descriptions: 0,
                metadata: 0,
                dependent: 0,
                still_image: 0,
                multilayer: 0
              }
            },
            {
              index: 1,
              codec_name: 'h264',
              codec_long_name: 'H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10',
              profile: 'High',
              codec_type: 'video',
              codec_tag_string: '[27][0][0][0]',
              codec_tag: '0x001b',
              width: 720,
              height: 400,
              coded_width: 720,
              coded_height: 400,
              closed_captions: 0,
              film_grain: 0,
              has_b_frames: 2,
              sample_aspect_ratio: '1:1',
              display_aspect_ratio: '9:5',
              pix_fmt: 'yuv420p',
              level: 30,
              chroma_location: 'left',
              field_order: 'progressive',
              refs: 1,
              is_avc: 'false',
              nal_length_size: '0',
              r_frame_rate: '24/1',
              avg_frame_rate: '24/1',
              time_base: '1/90000',
              bits_per_raw_sample: '8',
              extradata_size: 39,
              disposition: {
                default: 0,
                dub: 0,
                original: 0,
                comment: 0,
                lyrics: 0,
                karaoke: 0,
                forced: 0,
                hearing_impaired: 0,
                visual_impaired: 0,
                clean_effects: 0,
                attached_pic: 0,
                timed_thumbnails: 0,
                non_diegetic: 0,
                captions: 0,
                descriptions: 0,
                metadata: 0,
                dependent: 0,
                still_image: 0,
                multilayer: 0
              }
            }
          ],
          format: {
            filename: 'rtp://127.0.0.1:1234',
            nb_streams: 2,
            nb_programs: 1,
            nb_stream_groups: 0,
            format_name: 'rtp',
            format_long_name: 'RTP input',
            probe_score: 100
          },
          requests: []
        }
      }
    }
  ]
}
