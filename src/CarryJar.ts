import {Jar} from "./Jar";
import {CookieData} from "./types";

export class CarryJar extends Array<CookieData> {

    toString = () => this.map(({name, value}) => `${name}=${value}`).join('; ')

    cloneJars(...jars: Jar[]) {
        for (const j of jars) j.clone(this)
        return this
    }
}