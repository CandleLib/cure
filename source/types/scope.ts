import { MinTreeNode } from "@candlefw/js";
import { DependGraphNode } from "./depend_graph_node";
import { ImportDependNode } from "./import_depend_node";

export type Pragma = {
    type: string,
    nodes: MinTreeNode[]
}

export type Scope = {
    ast: MinTreeNode;
    offset: number;
    parent?: Scope;
    imp: ImportDependNode[];
    dec: DependGraphNode[];
    stmts: DependGraphNode[];
    root: MinTreeNode;
    nodes: MinTreeNode[];
    pragmas: Pragma[],
    USE_ALL: boolean
};
