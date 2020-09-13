import fs from "fs";
import path from "path";

import URL from "@candlefw/url";

import {
    parser, JSNodeType,
    ext, JSNodeClass,
    stmt, renderWithFormatting
} from "@candlefw/js";
import { traverse, skip_root } from "@candlefw/conflagrate";
import { format_rules } from "./format_rules.js";
import { getPackageJsonObject } from "@candlefw/wax";
import { PackageJSONData } from "@candlefw/wax/build/types/types/package";

const fsp = fs.promises;



export const test = null;

export async function createSpecFile(pkg_name: string, source_file_path: string, pwd: string = process.cwd())
    : Promise<string> {

    await URL.polyfill();

    const
        url = URL.resolveRelative(source_file_path, pwd + "/"),
        data = await url.fetchText(),
        { ast } = parser(data),
        new_ast = parser(";").ast,
        imports = [];

    let n = [];

    for (const { node } of traverse(ast, "nodes")
        .filter("type", JSNodeType.ExportDeclaration)
    ) {
        if (node.nodes[0])
            for (const { node: name } of traverse(node.nodes[0], "nodes", 1)) {
                switch (name.type) {
                    case JSNodeType.FunctionDeclaration:
                        imports.push(ext(name.nodes[0]));
                        break;
                    case JSNodeType.Class:
                        imports.push(ext(name.nodes[0]));
                        break;
                    case JSNodeType.VariableDeclaration:
                    case JSNodeType.LexicalDeclaration:
                        for (const { node: id } of traverse(name, "nodes", 2)
                            .then(skip_root())) {
                            if (id.type == JSNodeType.BindingExpression)
                                imports.push(ext(id.nodes[0]));
                            else
                                imports.push(ext(id.nodes[0]));
                        }
                        break;
                    case JSNodeType.ExportClause:
                        for (const { node: id } of traverse(name, "nodes", 2)
                            .then(skip_root())) {
                            if (id.type & JSNodeClass.IDENTIFIER)
                                imports.push(ext(id));
                            else {
                                imports.push(ext(id.nodes[1] || id.nodes[0]));
                            }
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

    return renderWithFormatting(new_ast, <any>format_rules);
}
export function processPackageData(pkg: PackageJSONData, cfw_test_pkg: PackageJSONData = null, FORCE: boolean = false) {


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

    devDependencies["@candlefw/test"] = cfw_test_pkg.version;

    const test_name = name.replace(/[\@\/\\]/g, " ").trim().split(" ").join(".") + ".spec.js";

    if (!scripts)
        pkg.scripts = { test: "" };

    if (pkg.scripts.test && !FORCE)
        throw new Error(`This will overwrite existing test script [ ${pkg.scripts.test} ]. Aborting.`);

    pkg.scripts.test = `cfw.test ./test/**`;
    pkg.scripts["test.watch"] = `cfw.test -w ./test/**`;

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

    await URL.server();

    let url = new URL(dir);

    if (url.IS_RELATIVE) {
        url = URL.resolveRelative(url, process.cwd() + "/");
    }
    const { package: tst_pkg, FOUND } = await getPackageJsonObject(URL.getEXEURL(import.meta).path);
    const package_data = await getPackageJsonObject(url.path);

    if (package_data.FOUND && FOUND) {

        const
            { package: pkg, package_dir: dir } = package_data,
            { main, name, test_name } = processPackageData(pkg, tst_pkg, FORCE),
            file = await createSpecFile(name, main, dir),
            package_json = JSON.stringify(pkg, null, 4);

        await fsp.writeFile(path.join(dir, "package.json"), package_json, { encoding: "utf8" });
        await fsp.mkdir(path.join(dir, "test"), { recursive: true });
        await fsp.writeFile(path.join(dir, "test", test_name), file, { encoding: "utf8" });
    }


    return "";
}