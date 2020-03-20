import { MinTreeNode } from "@candlefw/js";
import { Scope } from "./scope";
import { DependGraphNode } from "./depend_graph_node";

export interface AssertionSite {
    type: "THREADED" | "SEQUENCED",

    /**
     * Index of the assertion site within the source file. Top Down. 
     */
    index?: number,

    start: number,

    ast: MinTreeNode,

    name_data: { name: string, suite_names: string[]; },

    scope: Scope,

    names: Set<string>,

    AWAIT: boolean;

    statements?: Array<AssertionSite | DependGraphNode>;
};
