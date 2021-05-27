import { JSNode } from "@candlelib/js";
import { Lexer } from "@candlelib/wind";

export interface ImportModule extends DependGraphNode {

    /**
     * An array of ImportNames
     */
    import_names: Array<ImportName>;

    /**
     * This is left empty.
     */
    exports: Set<string>;

    /**
     * The path / URL / module_name of the import.
     */
    module_source: string;

    /**
     * `true` if the module specifier is a relative pathname.
     */
    IS_RELATIVE: boolean;
};

export interface DependGraphNode {

    type: "DEPEND_GRAPH_NODE";

    ast: JSNode;

    imports: Set<string>;

    exports: Set<string>;

    AWAIT: boolean;
};

/**
 * Maps a module name to a file path.
 */
export interface ModuleSpecifier {

    /**
     * Name of a module export.
     */
    module_specifier: string,

    /**
     * URL or name of a module.
     */
    module_name: string;

    /**
     * Position of the export name in the source
     */
    pos: Lexer;
};

/**
 * Information
 */
export interface ImportSource {

    /**
     * Resolved URL of the module. 
     */
    source: string;

    /**
     * Names of exports required of the module.
     */
    import_names: string[];

    /**
     * original import url of the module
     */
    module_specifier: string;

    /**
     * `true` if the module_source is a relative path.
     */
    IS_RELATIVE: boolean;
};

/**
 * Named import reference.
 */
export interface ImportName {
    /**
     * The reference name of the import that is available within the script;
     */
    import_name: string;
    /**
     * The original name of the imported reference as exported from the module;
     */
    module_name: string;
    /**
     * Position of the import name in the source
     */
    pos: Lexer;
};

export interface ImportRequirement {
    module: ImportModule;
    name: ImportName;
}