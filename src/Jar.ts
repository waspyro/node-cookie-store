import {CookieData} from "./types";
import {isBadCookie, isExpiredCookie} from "./utils";

export class Jar {
    map = new Map

    constructor(private emitDel, private emitSet) {
    }

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