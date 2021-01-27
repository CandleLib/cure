import { JSNode } from "@candlefw/js";
import { traverse, breadthTraverse } from "@candlefw/conflagrate";
export const jst = (node: JSNode, depth?: number) => traverse(node, "nodes", depth);
export const jstBreadth = (node: JSNode, depth?: number) => breadthTraverse(node, "nodes", depth);
