import Cookies from "./Cookies.js";
import {parseSetCookie, isExpiredCookie, cookie2filename, loadFolderContent} from "./utils.js";
import fs from 'fs/promises'
import Path from 'path'
import {mkdirp, mkdirP} from "mkdirp";

export default class CookieStore {

  box = []
  jar = {sub: {}, multi: new Cookies, local: new Cookies, domain: '.'}

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
      this.ondel(cookie)
    } else if (!this.onset(cookie)) {
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

  all() {
    return this.box.map(el => el.cookie)
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
    if(isExisted) this.set(await loadFolderContent(path))
    this.on('set', cookie => fs.writeFile(Path.join(path, cookie2filename(cookie)), JSON.stringify(cookie)))
    this.on('del', cookie => fs.unlink(Path.join(path, cookie2filename(cookie))))
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