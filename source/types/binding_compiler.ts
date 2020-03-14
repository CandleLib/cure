import { MinTreeNodeClass, MinTreeNodeType, MinTreeNode } from "@candlefw/js";

/**
 * An object used to compile double parenthesize bindings into a testable and reportable
 * expression.
 */
export type BindingExpressionCompiler = {

    /**
     * The signature of the first MinTreeNode in the double parenthesize expression.
     * 
     * Can either be a MinTreeNodeType or bitwise OR set of MinTreeNodeClasses
     * 
     * Uses a bitwise AND test against the node's type to determine whether this
     * particular binding should advanced to the test stage.
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
    build: (node: MinTreeNode) => string | MinTreeNode | null;

    /**
     * Return an exception message that will be used as the report if the test fails.
     */
    getExceptionMessage: (node: MinTreeNode) => string;

    /**
     * An error message if the compiling failed. Only used if this is the last
     * acceptable compiler for the expression
     */
    hard_fail_error_message: string;
};
