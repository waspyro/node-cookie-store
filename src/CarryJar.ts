import {Jar} from "./Jar";

export class CarryJar extends Map<string, string> {

    addFromJar = (jar: Jar) => {
        for(const cookie of jar.map.values())
            this.set(cookie.name, cookie.value)
        return this
    }

    toString = () => { //todo? should encode name and value automatically? 🤔
        let str = ''
        for(const [name, value] of this.entries())
            str += `${name}=${value}; `
        return str.substring(0, str.length-2)
    }

}