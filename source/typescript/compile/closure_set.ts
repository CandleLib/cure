export class cachedSet {
    cache: string[];

    constructor() {
        this.cache = null;
    }

    values() {
        if (this.cache)
            return this.cache;
        this.cache = [...this.__values()];
        return this.cache;
    }

    add(val) {
        this.cache = null;
        this.__add(val);
    }

    protected __values(): string[] { return this.cache || []; }
    protected __add(val: string): cachedSet { return this; };
};

export class cSet extends cachedSet {
    outer_set: Set<string> | cUnion | cSet | cDiff;
    private inner_set: Set<string>;
    constructor(outer_set: Set<string> | cSet = null) {
        super();
        this.outer_set = outer_set;
        this.inner_set = null;
        //this.inner_set = new Set;
    }
    has(str) {
        return !!this?.outer_set?.has(str);
    }

    __add(str) {
        if (!str) return this;
        if (!this.inner_set)
            this.inner_set = new Set();
        this.inner_set.add(str);
        return this;
    }

    __values() {
        return [...(this?.outer_set?.values() ?? [])];
    }

    get size() {
        return (this?.outer_set.size ?? 0);
    }
}

export class cUnion extends cachedSet {
    setA: Set<string> | cUnion | cSet | cDiff;
    setB: Set<string> | cUnion | cSet | cDiff;

    constructor(setA, setB) {
        super();
        this.setA = setA;
        this.setB = setB;
    }

    has(str) {

        return this.setA.has(str) || this.setB.has(str);
    }

    __values() {
        return [...new Set([...this.setA.values(), ...this.setB.values()]).values()];
    }

    __add(str) {
        if (!str) return this;
        this.setA.add(str);
        return this;
    }

    get size() {
        return (this?.setA.size ?? 0) + (this?.setB.size ?? 0);
    }
}

export class cDiff extends cachedSet {

    setA: Set<string> | cUnion | cSet | cDiff;
    setB: Set<string> | cUnion | cSet | cDiff;

    constructor(setA, setB) {
        super();
        this.setA = setA;
        this.setB = setB;
    }

    has(str) {
        return this.setA.has(str) && !this.setB.has(str);
    }
    __values() {
        const val = [];

        for (const ref of this.setA.values()) {
            if (!this.setB.has(ref))
                val.push(ref);
        }

        return val;
    }


    __add(str) {
        if (!str) return this;
        this.setA.add(str);
        return this;
    }

    get size() {
        return [...this.values()].length;
    }

}