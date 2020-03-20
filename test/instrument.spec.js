"Instrumentation Spec";

import { getPackageJSON, instrument, processPackageData, createSpecFile } from "../build/library/utilities/instrument.js";
import { sym_version } from "../build/library/utilities/sym_version.js";
import fs from "fs";

{
    "Gets package.json";

    "Loads package.json";
    (((await getPackageJSON()).FOUND == true));

    "Loads @candlefw/package.json";
    (((await getPackageJSON()).package.name == "@candlefw/test"));

    "The directory that package.json is found in should be the same as CWD/PWD";
    (((await getPackageJSON()).package_dir == process.cwd()));
}

{
    "Processes package.json";

    "processPackageData throws if the package is not a module: commonjs";
    ((!processPackageData({ main: "test", type: "commonjs", name: "@candlefw/test" })));

    "processPackageData throws if the package is not a module: no type";
    ((!processPackageData({ main: "test", name: "@candlefw/test" })));

    "processPackageData does not throw if the package is a module";
    ((processPackageData({ main: "test", type: "module", name: "@candlefw/test" })));

    "Adds @candlefw/test@latest to devDependencies of package.json";
    const pkg = { main: "test", type: "module", name: "@candlefw/test" };
    processPackageData(pkg);
    ((pkg.devDependencies["@candlefw/test"] == sym_version));
}

{
    "Creates spec file";

    "Creates spec files string from data from source file: sym_version.js";

    const sym_version_string =
        `import {sym_version} from "../build/library/utilities/sym_version.js"; "cfw.test sym_version test spec"; "TODO - test: sym_version"; ((sym_version));`;

    ((await createSpecFile("cfw.test sym_version", "./build/library/utilities/sym_version.js") == sym_version_string));


    "Creates spec files string from data from source file: instrument.js";

    const inspect_string =
        `import {test,getPackageJSON,createSpecFile,processPackageData,instrument} from "../build/library/utilities/instrument.js"; ` +
        `"cfw.test inspect test spec"; "TODO - test: test"; ((test)); "TODO - test: getPackageJSON"; ((getPackageJSON)); "TODO - test: ` +
        `createSpecFile"; ((createSpecFile)); "TODO - test: processPackageData"; ((processPackageData)); "TODO - test: instrument"; ((instrument));`;

    ((await createSpecFile("cfw.test inspect", "./build/library/utilities/instrument.js") == inspect_string));
}

SEQUENCE: {
    "Simulated Test";

    const fsp = fs.promises;
    //Copy data to new location.
    await fsp.mkdir("./__temp__/");

    await fsp.copyFile("./package.json", "./__temp__/package.json");

    AFTER: {

    }
}