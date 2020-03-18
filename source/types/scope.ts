import { MinTreeNode } from "@candlefw/js";
import { DependGraphNode } from "./depend_graph_node";
import { ImportDependNode } from "./import_depend_node";

/**
 * A pragma condition to include before or after the test statements.
 */
export interface Pragma {

    /**
     * The type of pragma.
     * 
     * `"BE"` - BeforeEach
     * `"AE"` - AfterEach
     */
    type: "BE" | "AE",

    /**
     * A list of MinTreeNode statements nodes to include before or after the test statements.  
     */
    nodes: MinTreeNode[];
};

/**
 * A set statements, variable names, and other data that restricted to a particular
 * JS scope, such as a block statement or a function declaration.
 */
export interface Scope {
    /**
     * The root MinTreeNode
     */
    ast: MinTreeNode;
    offset: number;
    parent?: Scope;
    imp: ImportDependNode[];
    dec: DependGraphNode[];
    stmts: DependGraphNode[];
    root: MinTreeNode;
    nodes: MinTreeNode[];
    pragmas: Pragma[],
    USE_ALL: boolean;
};
