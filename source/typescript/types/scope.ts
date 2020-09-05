import { JSNode } from "@candlefw/js";
import { DependGraphNode } from "./depend_graph_node";
import { ImportModule } from "./import_module";

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
     * A list of JSNode statements nodes to include before or after the test statements.  
     */
    nodes: JSNode[];
};

/**
 * A set statements, variable names, and other data that restricted to a particular
 * JS scope, such as a block statement or a function declaration.
 */
export interface Scope {
    type: "SCOPE";
    /**
     * The root JSNode
     */
    ast: JSNode;
    offset: number;
    parent?: Scope;
    imp: ImportModule[];
    //dec: DependGraphNode[];
    stmts: (DependGraphNode | Scope)[];
    //root: JSNode;
    // nodes: JSNode[];
    pragmas: Pragma[],
    USE_ALL: boolean;
};
