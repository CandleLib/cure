import { MinTreeNode } from "@candlefw/js";
import { Scope } from "./scope";

export interface AssertionSite {
    /**
     * Index of the assertion site within the source file. Top Down. 
     */
    index?: number,

    start: number;

    node: MinTreeNode;

    name: string;

    scope: Scope;

    names: Set<string>;
};
