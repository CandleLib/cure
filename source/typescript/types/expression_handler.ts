import { JSNodeClass, JSNodeType, JSNode } from "@candlefw/js";
import { Reporter } from "../test";

/**
 * An object used to compile double parenthesis bindings into a testable and reportable
 * expression.
 */
export interface ExpressionHandler {
    /**
     * Internal use
     * 
     * Used to identify tests that use this ExpressionHandler
     */
    identifier: number;

    /**
     * The signature of the first JSNode in the double parenthesis expression.
     * 
     * Can either be a JSNodeType value or bitwise OR flag of JSNodeClasses values.
     * 
     * Used to perform a bitwise AND test against the expressions type to determine whether this
     * particular binding should advanced to the next stage of selection.
     */
    signature: JSNodeType | JSNodeClass,

    /**
     * Test to see if the node AST is in a form that should be handled by this compiler.
     * 
     * If `true` is returned, this Binding compiler will be accepted as the handler for the
     * test.
     */
    test: (node: JSNode) => boolean,

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
     * Thus, if the build expression evaluates to a truthy value, the assertion failure 
     * code branch will run.
     * 
     * 
     * @param {JSNode} node The first AST node within the double parenthesis AssertionSite.
     */
    build: (node: JSNode) => string;

    /**
     * Return an exception message that will be used as the report if the test fails.
     */
    getExceptionMessage: (node: JSNode, reporter: Reporter) => {

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