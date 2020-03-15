import { MinTreeNode } from "@candlefw/js";
import { DependGraphNode } from "./DependGraphNode";
import { ImportDependNode } from "./ImportDependNode";
export type Scope = {
    ast: MinTreeNode;
    offset: number;
    parent?: Scope;
    imp: ImportDependNode[];
    dec: DependGraphNode[];
    stmts: DependGraphNode[];
    root: MinTreeNode;
    nodes: MinTreeNode[];
};
