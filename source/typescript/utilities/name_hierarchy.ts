export let name_delimiter: string = "-->";

export function setNameDelimiter(delimiter: string) {
    name_delimiter = delimiter.toString();
}

export function createHierarchalName(...names: string[]): string {
    return names.join("-->");
}

export function splitHierarchalName(names: string): string[] {
    return names.split(name_delimiter);
}