/**
 * Should pull in imported objects based on the configuration of the project. 
 * 
 * Files within the source folder, essentially any folder not in the node_modules folder or in the test folder,
 * are searched for exports and catalogued. All exported functions and objects are ranked according to the 
 * following metrics:
 * 
 * Source files that explicitly designated in the package.json, cure_config(.json/.js), or the tsconfig.json
 * files get highest priority. Any exported names matching the missing references in a spec file will be
 * selected as the assumed desired import. 
 * 
 * Exports from any other source file from within the repo are given second priority.
 * 
 * Third, exports from dependencies within the package.json folder are considered.
 * 
 * Finally, runtime libraries are considered. 
 * 
 * For simplicity sake, only named exports are considered, unless a default name mapping is specified in 
 * cure.config(.json/.js)
 */

import { PackageJSONData } from "@candlelib/paraffin/build/types/types/package";
import URL from "@candlelib/uri";
import { JSNodeType, parser } from "@candlelib/js";
import { traverse } from "@candlelib/conflagrate";


const enum ImportRank {

    /**
     * A project file that is exported as a main
     * consumable for end users. 
     * 
     * Highest Priority
     */
    PROJECT_EXPORT,

    /**
     * A source or build file imported by other source
     * files within the project.
     * 
     * 2nd Priority
     */
    PROJECT_SOURCE,

    /**
     * An import from a dependency specified in the package.json file
     */
    DEPENDENCY_SOURCE,

    /**
     * Default imports provided by the runtime system
     */
    RUNTIME_SOURCE
}

interface ImportTarget {
    rank: ImportRank,
    import_name: string;
    module_uri: string;

}

/**
 * Gather files and importable modules and scan for import objects. 
 */
async function profileProject(pkg: PackageJSONData, project_dir: URL) {
    /**
     * Look for information that will guide the selection of files 
     */
    const dependencies = pkg.dependencies;
    const main = pkg.main;

    //Search folders for source files

}

// Todo - Replace with Taper

async function parseSourceFileForExportAndImportInformation(source_text: string, source_url: URL) {

    const ast = parser(source_text).ast;

    for (const { node } of traverse(ast, "type").filter("type",
        JSNodeType.ImportDeclaration,
        JSNodeType.ExportDeclaration)
    ) {
        switch (node.type) {
            case JSNodeType.ImportDeclaration:
                /**
                 * Read import location and create ImportTargets based on that location.
                 * 
                 */
                break;
            case JSNodeType.ExportDeclaration:
                /**
                 * Read export objects, get as name, and record ImportTargets for this object,
                 * noting the priority level.
                 * 
                 * Add file watchers if required and the file is a project file.
                 */
                break;
        }
    }
}