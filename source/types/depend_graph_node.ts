import { MinTreeNode } from "@candlefw/js";

export interface DependGraphNode {

    type: "DEPEND_GRAPH_NODE";

    ast: MinTreeNode;

    imports: Set<string>;

    exports: Set<string>;

    AWAIT: boolean;
};
