const helper = require('../../src/helper')

function testCreateUrlWithAbsolutePath() {
  let base = 'http://cdnapi.kaltura.com/p/1719221/sp/171922100/playManifest/entryId/1_0mc3z57p/format/applehttp/protocol/http/uiConfId/26605911/a.m3u8'
  let path = 'http://klive.kaltura.com/s/dc-1/live/hls/p/1719221/e/1_0mc3z57p/sd/6000/t/TREcJqwL0O6xaJkbvg7F5w/index-s32.m3u8?__hdnea__=st=1552770144~exp=1552856544~acl=/s/dc-1/live/hls/p/1719221/e/1_0mc3z57p/sd/6000/t/TREcJqwL0O6xaJkbvg7F5w/index-s32.m3u8*~hmac=eaf7647f0e9e280aac7c883ab45372cf8aef050fc3d8cadb4b7b9e1984ec6971'
  let result = helper.createUrl(base, path)
  let test = 'http://klive.kaltura.com/s/dc-1/live/hls/p/1719221/e/1_0mc3z57p/sd/6000/t/TREcJqwL0O6xaJkbvg7F5w/index-s32.m3u8?__hdnea__=st=1552770144~exp=1552856544~acl=/s/dc-1/live/hls/p/1719221/e/1_0mc3z57p/sd/6000/t/TREcJqwL0O6xaJkbvg7F5w/index-s32.m3u8*~hmac=eaf7647f0e9e280aac7c883ab45372cf8aef050fc3d8cadb4b7b9e1984ec6971'
  console.log(arguments.callee.name, result === test)
}

function testCreateUrlWithoutSlashInPath() {
  let base = 'http://cdnapi.kaltura.com/p/1719221/sp/171922100/playManifest/entryId/1_0mc3z57p/format/applehttp/protocol/http/uiConfId/26605911/a.m3u8'
  let path = 'seg-101014533-v1-a1.ts?__hdnea__=st=0~exp=2147483647~acl=/s/dc-1/live/hls/p/1719221/e/1_0mc3z57p/sd/6000/t/TREcJqwL0O6xaJkbvg7F5w/*~hmac=0345428e53f9b89d21b42818535560d261cb810c5e0fe3d4a450fe1d6d0eb405'
  let result = helper.createUrl(base, path)
  let test = 'http://cdnapi.kaltura.com/p/1719221/sp/171922100/playManifest/entryId/1_0mc3z57p/format/applehttp/protocol/http/uiConfId/26605911/seg-101014533-v1-a1.ts?__hdnea__=st=0~exp=2147483647~acl=/s/dc-1/live/hls/p/1719221/e/1_0mc3z57p/sd/6000/t/TREcJqwL0O6xaJkbvg7F5w/*~hmac=0345428e53f9b89d21b42818535560d261cb810c5e0fe3d4a450fe1d6d0eb405'
  console.log(arguments.callee.name, result === test)
}

function testCreateUrlWithSlashInPath() {
  let base = 'http://cdnapi.kaltura.com/p/1719221/sp/171922100/playManifest/entryId/1_0mc3z57p/format/applehttp/protocol/http/uiConfId/26605911/a.m3u8'
  let path = '/seg-101014533-v1-a1.ts?__hdnea__=st=0~exp=2147483647~acl=/s/dc-1/live/hls/p/1719221/e/1_0mc3z57p/sd/6000/t/TREcJqwL0O6xaJkbvg7F5w/*~hmac=0345428e53f9b89d21b42818535560d261cb810c5e0fe3d4a450fe1d6d0eb4058'
  let result = helper.createUrl(base, path)
  let test = 'http://cdnapi.kaltura.com/seg-101014533-v1-a1.ts?__hdnea__=st=0~exp=2147483647~acl=/s/dc-1/live/hls/p/1719221/e/1_0mc3z57p/sd/6000/t/TREcJqwL0O6xaJkbvg7F5w/*~hmac=0345428e53f9b89d21b42818535560d261cb810c5e0fe3d4a450fe1d6d0eb4058'
  console.log(arguments.callee.name, result === test)
}

function testCreateUrlWithDotsInPath() {
  let base = 'https://liveprodeuwest.global.ssl.fastly.net/btv/desktop/eu_event.m3u8'
  let path = '../../evt1/Channel-EUEVTqvs-AWS-ireland-1/Source-EUEVTqvs-240-1_live.m3u8'
  let result = helper.createUrl(base, path)
  let test = 'https://liveprodeuwest.global.ssl.fastly.net/evt1/Channel-EUEVTqvs-AWS-ireland-1/Source-EUEVTqvs-240-1_live.m3u8'
  console.log(arguments.callee.name, result === test)
}

module.exports = [
  testCreateUrlWithAbsolutePath,
  testCreateUrlWithoutSlashInPath,
  testCreateUrlWithSlashInPath,
  testCreateUrlWithDotsInPath
]