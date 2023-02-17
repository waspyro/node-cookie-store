import {Jar} from "./Jar";

export class CarryJar extends Array {

    toString = () => this.map(({name, value}) => `${name}=${value}`).join('; ')

    cloneJars(...jars: Jar[]) {
        for (const j of jars) j.clone(this)
        return this
    }
}