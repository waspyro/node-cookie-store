export default class CookieStore {

  static parseSetCookie(cookies) {
    if(typeof cookies === 'string') cookies = [cookies]
    return cookies.map(str => {
      const parts = str.split(';').map(part => part.trim().split('='))
      const [name, value] = parts.shift()
      const cookie = {name,value}
      for(const [key, value = true] of parts)
        cookie[key.toLowerCase()] = value // typeof value === 'string' ? decodeURIComponent(value) :
      return cookie
    })
  }

  jar = {sub: {}, cookies: {multi: [], local: []}}

  #set(cookie, domain, path) {
    if(!cookie.domain) cookie.domain = domain
    if(!cookie.path) cookie.path = path

    const domainSplit = cookie.domain.split('.')
    let it = this.jar, type = 'local'
    for(let i = domainSplit.length-1; i >= 0; i--) {
      const subdomain = domainSplit[i]
      if(!subdomain) {
        type = 'multi'
        break
      }
      if(!it.sub[subdomain]) it.sub[subdomain] = {cookies: {multi: new Map, local: new Map}, sub: {}, subdomain}
      it = it.sub[subdomain]
    }
    if(cookie.value) it.cookies[type].delete(cookie.name)
    it.cookies[type].set(cookie.name)
    it.cookies[type].push(cookie)
  }

  set(cookies, domain = '.', path = '/') {
    if(Array.isArray(cookies)) for(const c of cookies) this.#set(c, domain, path)
    else this.#set(cookies, domain, path)
  }

  get(url) { //todo check expired or deleted
    const domain = url.host
    const path = url.path
    const domainSplit = domain.split('.')

    const cookies = []
    let it = this.jar
    for(let i = domainSplit.length-1; i >= 0; i--) {
      if(!it.sub[domainSplit[i]]) break
      it = it.sub[domainSplit[i]]
      cookies.push(...it.cookies.multi) //todo apply path?
    }
    cookies.push(...it.cookies.local) //todo path filter
    return cookies
  }

}