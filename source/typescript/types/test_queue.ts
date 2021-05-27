import { JSNode } from "@candlelib/js";

/**
 * Interface for the test variable queue
 */

export interface TestQueue {

    /**
     * Pushes an and increment identifier
     *
     * @param node
     *
     * @returns returns a reference string [ $val## ] for the pushed identifier
     */
    push(node: JSNode | string): string;

    /**
     *
     * @param expression_script
     *
     * @returns returns a reference string  [ $exp## ] to the value of the boolean expression
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
}
;
