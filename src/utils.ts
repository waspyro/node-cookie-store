import {CookieData, UrlLike} from "./types";

export const parseSetCookie = (str: string, {hostname = '.', pathname = '/'}: UrlLike): CookieData => {
    const parts = str.split(';').map(part => part.trim().split('='))
    const [name, value] = parts.shift()
    const cookie = {name,value} as CookieData
    for(const [key, value = true] of parts)
        cookie[key.toLowerCase()] = value
    if(!cookie.domain) cookie.domain = hostname
    if(!cookie.path) cookie.path = pathname

    if(cookie["max-age"]) cookie.expires =
        new Date(Date.now() + Number(cookie['max-age']) * 1000)
    else if(cookie.expires) cookie.expires =
        new Date(cookie.expires)

    return cookie
}

export const parseSetCookies = (setCookies: string[], urlLike: UrlLike) =>
    setCookies.map(c => parseSetCookie(c, urlLike))

//at the time of writing node's builtin fetch joins multiple set-cookies headers into one,
//so this is wacky solution to resurrect those cookies.
export const splitJoinedCookieString = (str: string) => {
    if(!str) return []
    const cookiesStrings = []
    let sepConfirmed = 0;
    for(let i = 0; i <= str.length-1; i++) {
        if(str[i] !== ',') continue
        const sepInQuestion = i
        for(i++; i <= str.length-1; i++) {
            const ch = str[i]
            if(ch === '=') {
                cookiesStrings.push(str.substring(sepConfirmed, sepInQuestion).trim())
                sepConfirmed = sepInQuestion+1
                break
            } else if(ch === ';' || ch === ',') {
                i--
                break
            }
        }
    }

    cookiesStrings.push(str.substring(sepConfirmed, str.length).trim())
    return cookiesStrings
}

export const isExpiredCookie = (cookie: CookieData, timeOffset = 0) =>
    cookie.expires && Number(cookie.expires) < Date.now() - timeOffset

export const generateCookieName = (cookie: CookieData) =>
    cookie.domain.split('.').join('_') + '_' + cookie.name

export const cookie2filename = (cookie: CookieData, ext = '.cookie.json') =>
    generateCookieName(cookie) + ext

export const isBadCookie = (cookie) =>
    !cookie.value || isExpiredCookie(cookie)