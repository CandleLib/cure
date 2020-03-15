import { MinTreeNode } from "@candlefw/js";
export type DependGraphNode = {
    ast: MinTreeNode;
    imports: Set<string>;
    exports: Set<string>;
};
