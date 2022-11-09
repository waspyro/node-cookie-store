import Cookies from "./Cookies.js";
import {parseSetCookie, isExpiredCookie} from "./utils.js";

export default class CookieStore {

  box = []
  jar = {sub: {}, multi: new Cookies, local: new Cookies, domain: '.'}

  ondelete
  onset

  #set(cookie, domain, path) {
    if(!cookie.domain) cookie.domain = domain
    if(!cookie.path) cookie.path = path
    const domainSplit = cookie.domain.split('.')
    let jar = this.jar, multidomain = !domainSplit[0] //site.com vs .site.com
    for(let i = domainSplit.length-1; i >= Number(multidomain); i--) {
      const domain = domainSplit[i]
      if(!jar.sub[domain]) jar.sub[domain] = {multi: new Cookies, local: new Cookies, sub: {}, domain}
      jar = jar.sub[domain]
    }

    const store = jar[multidomain ? 'multi' : 'local']
    if(isExpiredCookie(cookie)) {
      if(store.has(cookie.name)) {
        store.delete(cookie.name)
        this.box = this.box.filter(el => el !== cookie)
        this.ondelete && this.ondelete(cookie)
      }
      return {cookie, set: false}
    } else {
      this.box.push({cookie, store})
      store.set(cookie.name, cookie)
      this.onset && this.onset(cookie)
      return {cookie, set: true}
    }
  }

  set(cookies, {hostname = '.', pathname = '/'} = {}) {
    if(Array.isArray(cookies)) return cookies.map(c => this.#set(c, hostname, pathname))
    else this.#set(cookies, hostname, pathname)
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
      this.ondelete && this.ondelete(cookie)
    })

    let jar = this.jar
    for(let i = domainSplit.length-1; i >= 0; i--) {
      if(jar.multi.size) addOrDelete(jar.multi)
      const domain = domainSplit[i]
      if(!jar.sub[domain]) return cookies
      jar = jar.sub[domain]
    }
    addOrDelete(jar.multi)
    addOrDelete(jar.local)
    return cookies
  }

}