import {
    CookieData,
    CookieStoreDelListener,
    CookieStoreSetListener, SubdomainStore,
    UrlLike
} from "./types";
import {
    cookie2filename,
    generateCookieName,
    isBadCookie,
    isExpiredCookie,
    parseSetCookie,
    parseSetCookies,
    splitJoinedCookieString
} from "./utils";

export default class Jar {
    map = new Map
    constructor(private emitDel, private emitSet) {}

    #set(cookie) {
        this.map.set(cookie.name, cookie)
        this.emitSet(cookie)
        return cookie
    }

    #del(cookie) {
        const res = this.map.delete(cookie.name)
        this.emitDel(cookie, res)
        return null
    }

    #check(cookie): CookieData | null {
        if(isExpiredCookie(cookie)) return this.#del(cookie)
        return cookie
    }

    add(cookie: CookieData): CookieData | null {
        return isBadCookie(cookie) ? this.#del(cookie) : this.#set(cookie)
    }

    clone(to = []) {
        for(const cookie of this.map.values()) this.#check(cookie) && to.push(cookie)
        return to
    }

    pick(name: string) {
        const cookie = this.map.get(name)
        if(!cookie) return null
        return this.#check(cookie)
    }

}

class CarryJar extends Array {

    // assign(...objects) {
    //     for(const object of objects)
    //         if(typeof object === 'object')
    //             for(const key in object)
    //                 this.set(key, {name: key, value: object[key]})
    //     return this
    // }

    toString = () => this.map(({name, value}) => `${name}=${value}`).join('; ')

    cloneJars(...jars: Jar[]) {
        for(const j of jars) j.clone(this)
        return this
    }
}

class CookieStore {
    jar: SubdomainStore
    #jarMap = {}

    constructor() {
        this.jar = this.createSubdomainStore()
        this.#jarMap['.'] = this.jar.multi
    }

    createSubdomainStore = (domain = '.', subdomain = '.'): SubdomainStore => ({
        sub: {},
        multi: new Jar(this.#emitDel, this.#emitSet),
        local: new Jar(this.#emitDel, this.#emitSet),
        meta: {subdomain, domain}
    })

    #shouldSave = (cookie) => this.filter === undefined || this.filter(cookie)

    #getJarForDomain(domain): Jar {
        if(this.#jarMap[domain]) return this.#jarMap[domain]
        const domainSplits = domain.split('.')
        const intType = Number(!domainSplits[0]) //0 if ".a.b.c" aka "multi"; 1 if "a.b.c" aka "local"
        let jar = this.jar
        for(let i = domainSplits.length-1; i >= intType; i--) {
            const subdomain = domainSplits[i]
            if(!jar.sub[subdomain]) jar.sub[subdomain] =
                this.createSubdomainStore(domain, subdomain)
            jar = jar.sub[subdomain]
        }
        return this.#jarMap[domain] = jar[intType ? 'multi' : 'local']
    }

    add(cookie: CookieData): CookieData | null {
        if(!this.#shouldSave(cookie)) return null
        return this.#getJarForDomain(cookie.domain).add(cookie)
    }

    addMany(cookies: CookieData[]) {
        return cookies.map(el => this.add(el)).filter(el => el)
    }

    get({hostname = '.'}: UrlLike) {
        //todo: caching
        //adding or deleting cookies for domain X should mark X and all known X subdomains as "cacheRequired"
        //when accessing domain X and X.cacheRequired we should calculate and cache cookies
        const domainSplits = hostname.split('.')
        const cookies = new CarryJar()

        let jar = this.jar
        for(let i = domainSplits.length-1; i >= 0; i--) {
            cookies.cloneJars(jar.multi)
            const domain = domainSplits[i]
            if(!jar.sub[domain]) return cookies
            jar = jar.sub[domain]
        }

        return cookies.cloneJars(jar.local, jar.multi)
    }

    addFromFetchResponse = (response: Response, requestUrl?: UrlLike) => {
        if(!requestUrl) requestUrl = new URL(response.url)
        const split = CookieStore.splitJoinedCookiesString(response.headers.get('set-cookie'))
        const parsed = parseSetCookies(split, requestUrl)
        return this.addMany(parsed)
    }

    filter
    #setListeners = []
    #delListeners = []
    onSet = (listener: CookieStoreSetListener) => this.#setListeners.push(listener)
    onDel = (listener: CookieStoreDelListener) => this.#delListeners.push(listener)
    offSet = (listener: CookieStoreSetListener) => this.#setListeners.filter(el => el !== el)
    offDel = (listener: CookieStoreDelListener) => this.#delListeners.filter(el => el !== el)
    #emitSet = (cookie: CookieData) => this.#setListeners.forEach(l => l(cookie))
    #emitDel = (cookie: CookieData, isIgnored: boolean) => this.#delListeners.forEach(l => l(cookie, isIgnored))

    static parseSetCookie = parseSetCookie
    static parseSetCookies = parseSetCookies
    static splitJoinedCookiesString = splitJoinedCookieString
    static isExpiredCookie = isExpiredCookie
    static generateCookieName = generateCookieName
    static cookie2filename = cookie2filename
    static isBadCookie = isBadCookie

}