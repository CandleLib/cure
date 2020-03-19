import { MinTreeNode } from "@candlefw/js";

export interface DependGraphNode {

    ast: MinTreeNode;

    imports: Set<string>;

    exports: Set<string>;

    AWAIT: boolean;
};
