import Jar from "./CookieStore";

export interface CookieData {
    name: string,
    value: string,
    domain: string,
    path: string,
    samesite?: string,
    expires?: Date,
    "max-age"?: number,
    httponly?: boolean,
    partitioned?: boolean,
    secure?: boolean,
}

export type UrlLike = {hostname: string, pathname: string}

export type CookieStoreSetListener = (cookie: CookieData) => void

export type CookieStoreDelListener = (cookie: CookieData, isIgnored: boolean) => void

export type CookieStoreEvents = {
    set: CookieStoreSetListener[]
    del: CookieStoreDelListener[]
}

export interface SubdomainStore {
    sub: {[key: string]: SubdomainStore}
    multi: Jar
    local: Jar
    meta: {subdomain: string, domain: string}
}