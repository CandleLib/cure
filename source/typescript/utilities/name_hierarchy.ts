export let name_delimiter: string = "-->";

export function setNameDelimiter(delimiter: string) {
    name_delimiter = delimiter.toString();
}

export function createHierarchalName(...names: string[]): string {
    return names.filter(_ => !!_).join(name_delimiter);
}

export function splitHierarchalName(names: string): string[] {
    return names.split(name_delimiter);
}