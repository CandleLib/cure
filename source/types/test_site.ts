import { MinTreeNode } from "@candlefw/js";
import { Scope } from "./scope";

export type TestSite = {

    start: number;

    node: MinTreeNode;

    name: string;

    scope: Scope;

    names: Set<string>;
};
