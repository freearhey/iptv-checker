module.exports.add = add
module.exports.check = check

let cache = new Set()

function add({ url }) {
  let id = hashUrl(url)

  cache.add(id)
}

function check({ url }) {
  let id = hashUrl(url)

  return cache.has(id)
}

function hashUrl(u) {
  return Buffer.from(u).toString(`hex`)
}
