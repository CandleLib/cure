"Instrumentation Spec";

import { getPackageJSON, instrument, processPackageData, createSpecFile } from "../build/library/utilities/instrument.js";
import { sym_version } from "../build/library/utilities/sym_version.js";
import fs from "fs";
import path from "path";

{
    "Gets package.json";

    "Loads package.json";
    assert((await getPackageJSON()).FOUND == true);

    "Loads @candlefw/package.json";
    assert((await getPackageJSON()).package.name == "@candlefw/test");

    "The directory that package.json is found in should be the same as CWD/PWD";
    assert((await getPackageJSON()).package_dir == process.cwd());
}

{
    "Processes package.json";

    "processPackageData throws if the package is not a module: commonjs";
    assert(!processPackageData({ main: "test", type: "commonjs", name: "@candlefw/test" }));

    "processPackageData throws if the package is not a module: no type";
    assert(!processPackageData({ main: "test", name: "@candlefw/test" }));

    "processPackageData does not throw if the package is a module";
    assert(processPackageData({ main: "test", type: "module", name: "@candlefw/test" }));

    "Adds @candlefw/test@latest to devDependencies of package.json";
    const pkg = { main: "test", type: "module", name: "@candlefw/test" };
    processPackageData(pkg);
    ((pkg.devDependencies["@candlefw/test"] == sym_version));
}

{
    "Creates spec file";

    "Creates spec files string from source file: sym_version.js";

    const sym_version_string =
        `import {sym_version} from "../build/library/utilities/sym_version.js"; "cfw.test sym_version test spec"; "TODO - test: sym_version"; ((sym_version));`;

    assert(await createSpecFile("cfw.test sym_version", "./build/library/utilities/sym_version.js") == sym_version_string);


    "Creates spec files string from source file: instrument.js";

    const inspect_string =
        `import {test,getPackageJSON,createSpecFile,processPackageData,instrument} from "../build/library/utilities/instrument.js"; ` +
        `"cfw.test inspect test spec"; "TODO - test: test"; ((test)); "TODO - test: getPackageJSON"; ((getPackageJSON)); "TODO - test: ` +
        `createSpecFile"; ((createSpecFile)); "TODO - test: processPackageData"; ((processPackageData)); "TODO - test: instrument"; ((instrument));`;

    assert(await createSpecFile("cfw.test inspect", "./build/library/utilities/instrument.js") == inspect_string);

    "Creates spec files string from source file: main.js";

    const main_string =
        `import {NullReporter,BasicReporter,createTestFrame} from "../build/library/main.js"; "cfw.test inspect test spec"; `
        + `"TODO - test: NullReporter"; ((NullReporter)); "TODO - test: BasicReporter"; ((BasicReporter)); "TODO - test: `
        + `createTestFrame"; ((createTestFrame));`;

    assert(await createSpecFile("cfw.test inspect", "./build/library/main.js") == main_string);
}


SEQUENCE: {
    "Simulated Test"; "#";

    const
        fsp = fs.promises,
        dir = "./__temp__/",
        build_dir = "./build/library/";

    //Copy data to new location.
    try {
        await fsp.mkdir(dir, { recursive: true });
        await fsp.mkdir(path.join(dir, build_dir), { recursive: true });
        await fsp.copyFile("./package.json", path.join(dir, "package.json"));
        await fsp.copyFile(path.join(build_dir, "main.js"), path.join(dir, build_dir, "main.js"));
    } catch (e) {
        $harness.setException(e);
        /*  Don't really care if this fails. 
            Likely the directory and file 
            already exists */ }

    await instrument(dir, true);

    assert(await fsp.readFile(path.join(dir, "test/candlefw.test.spec.js")));

    assert(await fsp.readFile(path.join(dir, "package.json")));

    const data = JSON.parse(await fsp.readFile(path.join(dir, "package.json")));

    assert(data.devDependencies["@candlefw/test"] == sym_version);

    assert(data.scripts.test == "cfw.test ./test/candlefw.test.spec.js");

    assert(await fsp.rmdir(dir, { recursive: true }));
}