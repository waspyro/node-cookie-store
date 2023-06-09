import {CookieData, CookieStoreEvents} from "./types";
import {isBadCookie, isExpiredCookie} from "./utils";

export class Jar {
    map = new Map<string, CookieData>

    constructor(private events: CookieStoreEvents) {}

    #set(cookie: CookieData) {
        this.map.set(cookie.name, cookie)
        this.events.set.emit([cookie])
        return cookie
    }

    #del(cookie: CookieData) {
        const res = this.map.delete(cookie.name)
        this.events.del.emit([cookie, res])
        return null
    }

    #check(cookie): CookieData | null {
        if (isExpiredCookie(cookie)) return this.#del(cookie)
        return cookie
    }

    add(cookie: CookieData): CookieData | null {
        return isBadCookie(cookie) ? this.#del(cookie) : this.#set(cookie)
    }

    clone(to = []) {
        for (const cookie of this.map.values()) this.#check(cookie) && to.push(cookie)
        return to
    }

    pick(name: string) {
        const cookie = this.map.get(name)
        if (!cookie) return null
        return this.#check(cookie)
    }

}