import { MinTreeNodeClass, MinTreeNodeType, MinTreeNode } from "@candlefw/js";

/**
 * An object used to compile double parenthesize bindings into a testable and reportable
 * expression.
 */
export type AssertionSiteCompiler = {

    /**
     * The signature of the first MinTreeNode in the double parenthesize expression.
     * 
     * Can either be a MinTreeNodeType or bitwise OR set of MinTreeNodeClasses
     * 
     * Uses a bitwise AND test against the node's type to determine whether this
     * particular binding should advanced to the next stage.
     */
    signature: MinTreeNodeType | MinTreeNodeClass,

    /**
     * Test to see if the node AST is in a form that should be handled by this compiler.
     * 
     * If `true` is returned, this Binding compiler will be accepted as the handler for the
     * test.
     */
    test: (node: MinTreeNode) => boolean,

    /**
     * Return a javascript expression string that evaluates to `true` or `false`
     */
    build: (node: MinTreeNode) => string | MinTreeNode;


    /**
     * Return an exception message that will be used as the report if the test fails.
     */
    getExceptionMessage: (node: MinTreeNode) => {

        /**
         * Syntax highlighting to add to source trace. 
         */
        highlight: string,

        /**
         * Error message 
         */
        message: string,

        /**
         * Match the string in the original source to be replaced by highlight.
         */
        match: string;

        column: number,

        line: number;
    };
};
