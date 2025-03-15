export class Cache {
  constructor() {
    this.store = new Set()
  }

  add(value) {
    this.store.add(value)
  }

  has(value) {
    return this.store.has(value)
  }

  clear() {
    this.store = new Set()
  }
}
