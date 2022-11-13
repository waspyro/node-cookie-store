import Cookies from "./Cookies.js";
import {parseSetCookie, isExpiredCookie} from "./utils.js";

export default class CookieStore {

  box = []
  jar = {sub: {}, multi: new Cookies, local: new Cookies, domain: '.'}

  ondel = null
  onset = null

  #set(cookie, domain, path) {
    if(!cookie.domain) cookie.domain = domain
    if(!cookie.path) cookie.path = path
    const domainSplit = cookie.domain.split('.')
    let jar = this.jar, subdomain
    while(domainSplit.length) {
      subdomain = domainSplit.pop()
      if(!subdomain) break
      if(!jar.sub[subdomain])
        jar.sub[subdomain] = {multi: new Cookies, local: new Cookies, sub: {}, subdomain}
      jar = jar.sub[subdomain]
    }

    const store = jar[subdomain ? 'local' : 'multi']
    let isSet = false
    if(isExpiredCookie(cookie) && store.has(cookie.name)) {
      store.delete(cookie.name)
      this.box = this.box.filter(el => el !== cookie)
      this.ondel && this.ondel(cookie, this)
    } else if (!this.onset || this.onset(cookie, this) !== 'ignore') {
      isSet = true
      this.box.push({cookie, store})
      store.set(cookie.name, cookie)
    }

    return {cookie, set: isSet}
  }

  set(cookies, {hostname = '.', pathname = '/'} = {}) {
    return Array.isArray(cookies)
      ? cookies.map(c => this.#set(c, hostname, pathname))
      : this.#set(cookies, hostname, pathname)
  }

  setFromHeaders(headers, url) {
    return this.set(parseSetCookie(headers['set-cookie']), url)
  }

  get({hostname = '.'}) { //todo pathname = '/'
    const domainSplit = hostname.split('.')

    const cookies = new Cookies
    const addOrDelete = (cookiesMap) => cookiesMap.forEach(cookie => {
      if (!isExpiredCookie(cookie)) return cookies.add(cookie)
      cookiesMap.delete(cookie.name)
      this.ondel && this.ondel(cookie, this)
    })

    let jar = this.jar
    for(let i = domainSplit.length-1; i >= 0; i--) {
      addOrDelete(jar.multi)
      const domain = domainSplit[i]
      if(!jar.sub[domain]) return cookies
      jar = jar.sub[domain]
    }
    addOrDelete(jar.multi)
    addOrDelete(jar.local)
    return cookies
  }

  all() {
    return this.box.map(el => el.cookie)
  }

  export() {
    return JSON.stringify(this.box.map(el => el.cookie), null, 1)
  }

  import(cookies) {
    for(const cookie of JSON.parse(cookies)) this.#set(cookie)
  }

}
