import { Lexer } from "@candlefw/wind";

/**
 * Maps sequenced test assertion sites.
 */
export interface TestMap {
    name: string;
    index: number;
    SOLO: boolean;
    RUN: boolean;
    INSPECT: boolean;

    pos: Lexer;
};