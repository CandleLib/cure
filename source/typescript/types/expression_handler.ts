import { JSNode, JSNodeBase, JSNodeClass, JSNodeType } from "@candlefw/js";
import { Reporter } from "../test";

/**
 * VM Stack used to create and report assertion expressions
 */
export interface TestStack {

    /**
     * Pushes an and increment identifier
     * 
     * @param node 
     * 
     * @returns returns a string for the pushed identifier: [$val##]
     */
    push(node: JSNode | string): string;

    /**
     * 
     * @param expression_script 
     * 
     * @returns returns a string for the pushed identifier: [$exp##]
     */
    evaluate(expression_script: string): string;

    /**
     * Create a boolean expression form the results of EvaluationStack
     * that determines whether the test has failed or not.
     * 
     * Multiple reports can be generated. If any report fails then the
     * whole test will fail. 
     * 
     * Report variables can accessed with the $r## identifier;
     * @param report_script 
     * 
     * @returns returns a string for the pushed identifier: [$rep##]
     */
    report(report_script: string): string;

    /**
     * Generate a name for the test based on the contents of
     * the expression nodes. This will override the default
     * stative name. If the assertion site specifies a dynamic
     * then this function will have no effect.
     */
    name(generated_name: string): void;
};

/**
 * VM Stack used to create and report assertion expressions
 */
export interface ReportStack {

    /**
     * Pops a value from the stack. If the value was originally
     * a JSNode, the computed value of the expression is returned.
     * 
     * Otherwise, a string with the original string value is returned.
     * 
     * Order of popped arguments is in the same order as pushed values,
     * FIFO
     * 
     */
    pop(): Generator<string | number | boolean, void>;
};
/**
 * An object used to compile double parenthesis bindings into a testable and reportable
 * expression.
 */
export interface ExpressionHandler<T extends JSNode> {
    /**
     * Internal use
     * 
     * Used to identify tests that use this ExpressionHandler
     * 
     */
    identifier?: number;

    /**
     * The signature of the first JSNode in the double parenthesis expression.
     * 
     * Can either be a JSNodeType value or bitwise OR flag of JSNodeClasses values.
     * 
     * Used to perform a bitwise AND test against the expressions type to determine whether this
     * particular binding should advanced to the next stage of selection.
     */
    filter: JSNodeType | JSNodeClass,

    /**
     * Test to see if the node AST is in a form that should be handled by this compiler.
     * 
     * If `true` is returned, this Binding compiler will be accepted as the handler for the
     * test.
     */
    confirmUse: (node: JSNode) => node is T,

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
    build: (node: T, expression_vm: TestStack) => void;

    /**
     * Return an exception message that will be used as the report if the test fails.
     */
    print: (expression_vm: ReportStack, reporter: Reporter) => string[];

};

export type ExpressionHandlerBase<T = JSNode> = ExpressionHandler<T>;