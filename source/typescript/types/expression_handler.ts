import { JSNode, JSNodeClass, JSNodeType } from "@candlelib/js";
import { Reporter } from "./reporter";
import { ReportQueue } from "./report_queue";
import { TestQueue } from "./test_queue";

/**
 * An object used to compile double parenthesis bindings into a testable and reportable
 * expression.
 */
export interface ExpressionHandler<T = JSNode> {
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
    confirmUse: (node: T) => node is T,

    /**
     * 
     * @param {JSExpressionClass} node The first AST node within the double parenthesis AssertionSite.
     */
    build: (node: T, test_queue: TestQueue) => void;

    /**
     * Return an exception message that will be used as the report if the test fails.
     */
    print: (report_queue: ReportQueue, reporter: Reporter) => string[];

};

export type ExpressionHandlerBase<T = JSNode> = ExpressionHandler<T>;