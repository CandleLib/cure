import { JSNode } from "@candlefw/js";

export interface DependGraphNode {

    type: "DEPEND_GRAPH_NODE";

    ast: JSNode;

    imports: Set<string>;

    exports: Set<string>;

    AWAIT: boolean;
};
