import {CookieData, CookieStoreEvents, SubdomainStore, UrlLike} from "./types";
import type {PersistormInstance} from "persistorm"; //should it be dev dependency?
import Listenable from "echolator";

import {
    cookie2filename,
    generateCookieName,
    isBadCookie,
    isExpiredCookie, parseFromFetchResponse, parseSetCookie,
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
        multi: new Jar(this.events),
        local: new Jar(this.events),
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

    get({hostname = '.'}: UrlLike = {}) {
        //todo: caching
        //adding or deleting cookies for domain X should mark X and all known X subdomains as "cacheRequired"
        //when accessing domain X and X.cacheRequired we should calculate and cache cookies
        const domainSplits = hostname.split('.')
        const cookies = new CarryJar()

        let jar = this.jar
        for(let i = domainSplits.length-1; i >= 0; i--) {
            cookies.addFromJar(jar.multi)
            const domain = domainSplits[i]
            if(!jar.sub[domain]) return cookies
            jar = jar.sub[domain]
        }

        return cookies
          .addFromJar(jar.multi)
          .addFromJar(jar.local)
    }

    addFromFetchResponse = (response: Response, requestUrl?: UrlLike) =>
        this.addMany(parseFromFetchResponse(response, requestUrl))

    #persistListenerRef = {set: null, del: null}

    usePersistentStorage = async (storage: PersistormInstance, deleteBrokenCookies = false) => {
        const data = await storage.geta({})

        if(deleteBrokenCookies)
            for(const name in data)
                if(data[name] === null)
                    storage.del(name)

        const restoredCookies = this.addMany(Object.values(data).filter(Boolean) as any)
        for(const action in this.#persistListenerRef)
            this.#persistListenerRef[action] = this.events[action].on(([cookie]) =>
                storage[action](generateCookieName(cookie), cookie))
        return restoredCookies
    }

    stopPersistentStorage = () => {
        for(const action in this.#persistListenerRef)
            this.events[action].off(this.#persistListenerRef[action])
    }

    filter: (cookie: CookieData) => boolean

    events: CookieStoreEvents = {
        set: new Listenable<[CookieData]>(),
        del: new Listenable<[CookieData, boolean]>()
    }

    static parseFromFetchResponse = parseFromFetchResponse
    static parseSetCookies = parseSetCookies
    static parseSetCookie = parseSetCookie
    static splitJoinedCookieString = splitJoinedCookieString
    static isExpiredCookie = isExpiredCookie
    static generateCookieName = generateCookieName
    static cookie2filename = cookie2filename
    static isBadCookie = isBadCookie

}
