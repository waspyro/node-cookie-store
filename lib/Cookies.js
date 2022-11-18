export default class Cookies extends Map {

  add(cookie) {
    this.set(cookie.name, cookie)
  }

  assign(...objects) {
    for(const object of objects)
      if(typeof object === 'object')
        for(const key in object)
          this.set(key, {name: key, value: object[key]})
    return this
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