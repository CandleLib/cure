import { MinTreeNodeClass, MinTreeNodeType, MinTreeNode } from "@candlefw/js";
import { Reporter } from "../main";

/**
 * An object used to compile double parenthesize bindings into a testable and reportable
 * expression.
 */
export interface AssertionSiteCompiler {

    /**
     * The signature of the first MinTreeNode in the double parenthesize expression.
     * 
     * Can either be a MinTreeNodeType value or bitwise OR flag of MinTreeNodeClasses values.
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
     * Return a JavaScript expression string that evaluates to `true` or `false`.
     * 
     * An assertion site is converted to:
     * 
     * ```javascript
     * if( build_expression ){ 
     *  // Code to handle a failed assertion
     * }
     * ```
     * Thus, if the build expression evaluates to `true`, this will cause an assertion to fail.
     * 
     * 
     * @param {MinTreeNode} node The first AST node within the double parenthesize AssertionSite.
     */
    build: (node: MinTreeNode) => string;

    /**
     * Return an exception message that will be used as the report if the test fails.
     */
    getExceptionMessage: (node: MinTreeNode, reporter: Reporter) => {

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

        /**
         * Original column number of the assertion site in the source code.
         */
        column: number,

        /**
         * Original line number of the assertion site in the source code.
         */
        line: number;
    };
};
