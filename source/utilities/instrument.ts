import fs from "fs";
import path from "path";

import URL from "@candlefw/url";

import { sym_version } from "./sym_version.js";
import { parser, MinTreeNodeType, ext, MinTreeNodeClass, stmt, render } from "@candlefw/js";
import { traverse, filter, bit_filter, skip_root } from "@candlefw/conflagrate";

const fsp = fs.promises;

export const test = null;

/**
 * Todo - Move to cfw.wax
 */
/**
 * Locates the nearest package.json file. Searches up the directory structure until one is found.
 * If no package.json file can be found, then the return object property FOUND will be false.
 */
export async function getPackageJSON(cwd: string = process.cwd()): Promise<{ package: Package, package_dir: string; FOUND: boolean; }> {
    //hunt down package.json

    const
        url = new URL(cwd),
        base_path = url.path.split("/").filter(s => s !== "..");

    let i = base_path.length,
        pkg = "{}",
        cwd_ = "",
        FOUND = false;

    while (i-- >= 0) {
        try {

            cwd_ = base_path.slice(0, i + 1).join("/");

            const
                search_path = path.join(cwd_, "package.json"),
                stats = fs.statSync(search_path);

            if (stats) {
                FOUND = true;
                pkg = await fsp.readFile(search_path, { encoding: "utf8" });
                break;
            }

        } catch (e) {
            //Suppress errors - Don't really care if there is no file found. That can be handled by the consumer.
        }
    }

    return { package: <Package>JSON.parse(pkg), package_dir: cwd_, FOUND };
}

export async function createSpecFile(pkg_name: string, source_file_path: string, pwd: string = process.cwd())
    : Promise<string> {

    await URL.polyfill();

    const
        url = URL.resolveRelative(source_file_path, pwd + "/"),
        data = await url.fetchText(),
        ast = parser(data),
        new_ast = parser(";"),
        imports = [];

    let n = [];

    for (const { node } of traverse(ast, "nodes")
        .then(filter("type", MinTreeNodeType.ExportDeclaration))
    ) {
        if (node.nodes[0])
            for (const { node: name } of traverse(node.nodes[0], "nodes", 1)) {
                switch (name.type) {
                    case MinTreeNodeType.FunctionDeclaration:
                        imports.push(ext(name.nodes[0]));
                        break;
                    case MinTreeNodeType.Class:
                        imports.push(ext(name.nodes[0]));
                        break;
                    case MinTreeNodeType.VariableDeclaration:
                    case MinTreeNodeType.LexicalDeclaration:
                        for (const { node: id } of traverse(name, "nodes", 2)
                            .then(skip_root())) {
                            if (id.type == MinTreeNodeType.BindingExpression)
                                imports.push(ext(id.nodes[0]));
                            else
                                imports.push(ext(id.nodes[0]));
                        }
                        break;
                    case MinTreeNodeType.ExportClause:
                        for (const { node: id } of traverse(name, "nodes", 2)
                            .then(skip_root())) {
                            if (id.type & MinTreeNodeClass.IDENTIFIER)
                                imports.push(ext(id));
                            else
                                imports.push(ext(id.nodes[1]));
                        }
                        break;
                }
            }
    }

    new_ast.nodes.length = 0;

    new_ast.nodes.push(stmt(`"${pkg_name} test spec";`));

    if (imports.length > 0) {
        let imp_str = [];

        for (const imp of imports) {
            imp_str.push(imp.value);

            new_ast.nodes.push(stmt(`{ 
                "TODO: Test ${imp.value}";"#";
                ((${imp.value}))
            }`));
        }

        new_ast.nodes.unshift(stmt(`import {${imp_str.join(",")}} from ".${source_file_path}"`));
    }

    return render(new_ast);
}
interface Package {
    main: string;
    type: "module" | "commonjs";
    name: string;
    scripts: {
        test?: string;
    };
    devDependencies: object;
}

export function processPackageData(pkg: Package, FORCE: boolean = false) {


    let {
        main,
        type,
        name,
        scripts,
        devDependencies,
    } = pkg;

    if (type !== "module")
        throw new TypeError(`cfw.test only works on module packages. The package type of [${name}] is [${type || "not defined"}]`);

    //add @candlefw/test to dev dependencies
    if (!devDependencies) {
        pkg.devDependencies = {};
        devDependencies = pkg.devDependencies;
    }

    devDependencies["@candlefw/test"] = sym_version;

    const test_name = name.replace(/[\@\/\\]/g, " ").trim().split(" ").join(".") + ".spec.js";

    if (!scripts)
        pkg.scripts = { test: "" };

    if (pkg.scripts.test && !FORCE)
        throw new Error(`This will overwrite existing test script [ ${pkg.scripts.test} ]. Aborting.`);

    pkg.scripts.test = `cfw.test ./test/${test_name}`;
    pkg.scripts["test.watch"] = `cfw.test -w ./test/${test_name}`;

    return {
        main,
        name,
        test_name
    };
}

/**
 * Instrumenting reads the project.json file, and uses information to generate
 * files and scripts to run cfw.tests within the the project. 
 *
 * This process includes the following steps, in no particular order:
 * - Get the name of the project and use it to name the spec file.
 * - Get the main entry point and read its exports to add to the spec file.
 * - Create a test folder (if one is not present) and create test spec file.
 * - Add a script entry in the package.json for testing with cfw.test
 * (Fatally Warn about overwriting existing scripts)
 * - (FUTURE) Use TypeScript typing information to generate basic tests. 
 */
export async function instrument(dir: string = process.cwd(), FORCE: boolean = false): Promise<string> {

    const package_data = await getPackageJSON(dir);

    if (package_data.FOUND) {

        const
            { package: pkg, package_dir: dir } = package_data,
            { main, name, test_name } = processPackageData(pkg, FORCE),
            file = await createSpecFile(name, main, dir),
            package_json = JSON.stringify(pkg, null, 4);

        await fsp.writeFile(path.join(dir, "package.json"), package_json, { encoding: "utf8" });
        await fsp.mkdir(path.join(dir, "test"), { recursive: true });
        await fsp.writeFile(path.join(dir, "test", test_name), file, { encoding: "utf8" });
    }

    return "";
}