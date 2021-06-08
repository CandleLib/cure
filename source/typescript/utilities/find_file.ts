import URL from "@candlelib/uri";
import fs from "fs";
export const fsp = fs.promises;

/**
 * Asynchronously Search for a file name matching the regular expression,
 * starting at `dir`.
 * 
 * Ascend into parent directories, up to the `root` directory,
 * until match is found. Return `null` if no match is found.
 * 
 * `dir` must either be `root` or a subdirectory of `root`
 * 
 * @param regex 
 * @param dir 
 * @param root 
 */
export async function findFile(regex: RegExp, dir: URL, root: URL = dir): Promise<URL> {

    if (dir.isSUBDIRECTORY_OF(root) || dir + "" == root + "")
        try {
            for (const obj of await fsp.readdir(dir + "", { withFileTypes: true })) {

                if (obj.isFile()) {

                    const name = obj.name;

                    if (regex.exec(name)) {
                        const new_url = new URL(dir);

                        new_url.path += name;

                        return new_url;
                    }
                }
            }

            const new_dir = new URL(dir);

            new_dir.path = dir.path.split("/").slice(0, -2).join("/") + "/";

            return findFile(regex, new_dir, root);
        } catch (e) { }

    return null;
}
