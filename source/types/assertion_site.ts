import { MinTreeNode } from "@candlefw/js";
import { Scope } from "./scope";

export interface AssertionSite {
    /**
     * Index of the assertion site within the source file. Top Down. 
     */
    index?: number,

    start: number;

    node: MinTreeNode;

    name_data: { name: string, suite_names: string[]; };

    scope: Scope;

    names: Set<string>;

    AWAIT: boolean;
};
