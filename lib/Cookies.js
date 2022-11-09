export default class Cookies extends Map {

  add(cookie) {
    this.set(cookie.name, cookie)
  }

  toString() {
    let str = ''
    for(const {name, value} of this.values()) str += name + '=' + value + '; '
    return str.substring(0, str.length-2)
  }

  value(name) {
    return this.get(name)?.value
  }

  toSetCookieString() {} //todo

  toArray() {
    return Array.from(this.values())
  }

}