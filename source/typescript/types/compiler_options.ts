import { JSNode } from "@candlefw/js";

export type CompilerOptions = {
    assertion_expr: any;
    BROWSER: any;
    INSPECT: boolean;
    SKIP: boolean;
    SOLO: boolean;
    SEQUENCED: boolean;
    name_expression?: JSNode;
    name: string;
    timeout_limit: number;
};
