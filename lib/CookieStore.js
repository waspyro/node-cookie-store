import {parseSetCookie, isExpiredCookie, cookie2filename, loadFolderContent} from "./utils.js";
import Cookies from "./Cookies.js";
import fs from 'fs/promises'
import Path from 'path'
import {mkdirp, mkdirP} from "mkdirp";

export default class CookieStore {

  jar = {sub: {}, multi: new Cookies, local: new Cookies, meta: {subdomain: '.', domain: '.'}}
  knownDomainStores = {'.': this.jar.multi}

  #set(cookie, domain, path) {
    if(!cookie.domain) cookie.domain = domain
    if(!cookie.path) cookie.path = path
    if(this.knownDomainStores[cookie.domain]) {
      if(this.onset(cookie)) return cookie
      this.knownDomainStores[cookie.domain].set(cookie.name, cookie)
      return cookie
    }

    const domainSplit = cookie.domain.split('.')
    const itstop = Number(!domainSplit[0])
    let jar = this.jar
    for(let i = domainSplit.length-1; i >= itstop; i--) {
      const subdomain = domainSplit[i]
      if(!jar.sub[subdomain]) jar.sub[subdomain] = {
        multi: new Cookies, local: new Cookies, sub: {}, meta: {subdomain, domain: cookie.domain}
      }
      jar = jar.sub[subdomain]
    }

    const store = jar[itstop ? 'multi' : 'local']
    this.knownDomainStores[cookie.domain] = store
    if(!this.onset(cookie)) store.set(cookie.name, cookie)
    return cookie
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

    const cookies = new Cookies //todo on conflict prioritize local cookies
    const addOrDelete = (cookiesStore) => cookiesStore.forEach(cookie => {
      if (!isExpiredCookie(cookie)) return cookies.add(cookie)
      cookiesStore.delete(cookie.name)
      this.ondel(cookie)
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

  forEach(cb) { //todo: knownNonEmptyDomainStores??
    for(const domain of Object.keys(this.knownDomainStores)) {
      const store = this.knownDomainStores[domain]
      store.forEach(cookie => {
        cb(cookie, () => {
          store.delete(cookie.name)
          this.ondel(cookie)
        })
      })
    }
    return this
  }

  all() {
    const array = []
    this.forEach(cookie => array.push(cookie))
    return array
  }

  clear() {
    this.forEach((_, remove) => remove())
  }

  clearExpired() {
    let removed = 0
    this.forEach((cookie, remove) => {
      if(!isExpiredCookie(cookie)) return
      remove()
      removed++
    })
    return removed
  }

  export() {
    return JSON.stringify(this.all(), null, 1)
  }

  import(cookiesJsonString) {
    for(const cookie of JSON.parse(cookiesJsonString)) this.#set(cookie)
  }

  //todo: react on fs events
  async useCookiesSaveLocation(...path) {
    path = Path.join(...path)
    const isExisted = await mkdirP(path)
    let restoredCookies = []
    if(isExisted) restoredCookies = this.set(await loadFolderContent(path))
    this.on('set', cookie => fs.writeFile(Path.join(path, cookie2filename(cookie)), JSON.stringify(cookie)))
    this.on('del', cookie => fs.unlink(Path.join(path, cookie2filename(cookie))))
    return restoredCookies
  }

  async useStorageDriver(driver) {
    const restoredCookies = this.set(await driver.get().then(Object.values))
    this.on('set', cookie => driver.set(cookie2filename(cookie, ''), cookie))
    this.on('del', cookie => driver.del(cookie2filename(cookie, '')))
    return restoredCookies
  }

  ondel = cookie => {
    for(let i = 0; i < this.listeners.del.length; i++)
      this.listeners.del[i](cookie, this)
  }

  onset = cookie => {
    let ignore = false
    for(let i = 0; i < this.listeners.set.length; i++)
      this.listeners.set[i](cookie, () => ignore = true, this)
    return ignore
  }

  listeners = {
    set: [],
    del: []
  }

  on(event, listener) {
    this.listeners[event].push(listener)
    return this
  }

  off(event, listener) {
    this.listeners[event].filter(e => e !== listener)
    return this
  }

  static cookie2filename = cookie2filename
  static parseSetCookie = parseSetCookie
  static isExpiredCookie = isExpiredCookie
  static loadFolderContent = loadFolderContent
  static mkdirp = mkdirp
  static mkdirP = mkdirP

}