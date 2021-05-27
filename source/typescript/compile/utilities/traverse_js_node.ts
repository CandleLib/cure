import { JSNode } from "@candlelib/js";
import { traverse, breadthTraverse } from "@candlelib/conflagrate";
export const jst = (node: JSNode, depth?: number) => traverse(node, "nodes", depth);
export const jstBreadth = (node: JSNode, depth?: number) => breadthTraverse(node, "nodes", depth);
