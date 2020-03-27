import { DependGraphNode } from "./depend_graph_node";
import { ImportName } from "./import_name";

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
