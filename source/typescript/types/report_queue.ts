/**
 * Pulls data from the TestQueue for use in reporting results tests.
 */
export interface ReportQueue {

    /**
     * Shifts a value stored in the TestQueue. If the value was originally
     * a stored as a JSNode expression, the computed value of the expression 
     * is returned.
     *
     * Otherwise, a string with the original string value is returned.
     *
     * Order of shifted arguments is in the same order that they were 
     * pushed into the TestQueue, sic FIFO
     */
    shift(): Generator<string | number | boolean, void>;
}
;
