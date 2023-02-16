import {CookieData, CookieStoreDelListener, CookieStoreSetListener, SubdomainStore, UrlLike} from "./types";
import type {StoreFS, StoreRedis} from "persistorm";

import {
    cookie2filename,
    generateCookieName,
    isBadCookie,
    isExpiredCookie,
    parseSetCookie,
    parseSetCookies,
    splitJoinedCookieString
} from "./utils";
import {Jar} from "./Jar";
import {CarryJar} from "./CarryJar";

export default class CookieStore {
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

    #persisenerRef = null
    async usePersistentStorage(storage: StoreFS | StoreRedis) { //todo: interface when available + pick used methods
        const data = await storage.geta({})
        const restoredCookies = this.addMany(Object.values(data))
        this.#persisenerRef = {}
        const Listener = action => cookie => this.#persisenerRef[action] =
            storage[action](CookieStore.generateCookieName(cookie), cookie)
        this.onSet(Listener('set'))
        this.onDel(Listener('del'))
        return restoredCookies
    }

    stopPersistentStorage() {
        if(!this.#persisenerRef) return
        this.offSet(this.#persisenerRef.set)
        this.offDel(this.#persisenerRef.del)
        this.#persisenerRef = null
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
