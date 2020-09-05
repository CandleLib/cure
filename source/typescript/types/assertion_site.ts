import { JSNode } from "@candlefw/js";
import { Scope } from "./scope";
import { DependGraphNode } from "./depend_graph_node";
import { TestMap } from "./test_map";

export interface AssertionSite {
    type: "THREADED",

    /**
     * Index of the assertion site within the source file, number from top to bottom.
     */
    index?: number,

    start: number,

    ast: JSNode,

    name_data: { name: string, suite_names: string[]; },

    scope: Scope,

    names: Set<string>,

    statements?: Array<AssertionSite | DependGraphNode>;

    imports?: Set<string>;

    exports?: Set<string>;

    AWAIT: boolean;
    SOLO: boolean;
    RUN: boolean;
    INSPECT: boolean;
};

export interface AssertionSiteSequence {
    type: "SEQUENCED";
    index: number,
    start: number,
    ast: JSNode,
    name_data: { name: string, suite_names: string[]; },
    scope,
    tests: TestMap[],
    names: Set<string>,
    AWAIT: boolean;
    SOLO: boolean;
    RUN: boolean;
    INSPECT: boolean;
}
