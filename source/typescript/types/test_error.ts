/**
 * Interface for any error that should be recorded
 * for later reporting
 */
export interface TransferableTestError {

    /**
     * Brief description of error
     */
    summary: string;

    /**
     * Details of error
     */
    detail?: string[];

    /**
     * Comma separated list of the stack trace
     */
    stack?: string;

    /**
     * Source file of error or string indicating the source location of the error.
     *
     * This should be the source location that gives the best indication of what went wrong.
     */
    source: "rig" | "runner" | "suite" | string;

    /**
     * Absolute character offset of error target in source
     */
    offset: number;

    /**
     * Line offset of error target in source
     */
    line: number;

    /**
     * Column offset of error target in source
     */
    column: number;

    /**
     * Indicates the reporter is allowed to read contents of source
     * file and generate a blame message.
     * 
     * Should be true only if the file is located in the CWD or a
     * subdirectory therein. If the source file contains a source map
     * the reporter is allowed to follow any chain of mappings to the 
     * original source file, provided such a file is contained within
     * the CWD.
     */
    CAN_RESOLVE_TO_SOURCE: boolean;
}
