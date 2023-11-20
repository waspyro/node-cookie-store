import {Jar} from "./Jar";
import Listenable from "echolator";

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

export type UrlLike = {hostname?: string, pathname?: string}

export type CookieStoreEvents = {
    set: Listenable<[CookieData]>,
    del: Listenable<[CookieData, boolean]>
}

export interface SubdomainStore {
    sub: {[key: string]: SubdomainStore}
    multi: Jar
    local: Jar
    meta: {subdomain: string, domain: string}
}