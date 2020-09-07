import { JSNode } from "@candlefw/js";
import { traverse } from "@candlefw/conflagrate";
export const jst = (node: JSNode, depth?: number) => traverse(node, "nodes", depth);
