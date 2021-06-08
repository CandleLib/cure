import { SourceMap } from "@candlelib/conflagrate";
import { TransferableTestError } from "./test_error.js";


/**
 * Closure environment for privileged methods that operate on internal properties
 * of TestHarness
 */
export interface TestHarnessEnvironment {

     /**
      * Initialize all stacks, queues to zero length and variables to zero and 
      * assign source file and working directory strings
      * @param test_source_location 
      * @param test_working_directory 
      */
     harness_init(test_source_location?: string, test_working_directory?): void;

     /**
      * Convert a source map string into a SourceMap object and assign
      * to the harness source_map property. Should only be called when
      * there is an active TestInfo through harness~pushTestResult
      */
     harness_initSourceMapFromString(test_source_map_string: string);

     /**
      * Convert a source map string into a SourceMap object and assign
      * to the harness source_map property.
      */
     harness_initialSourceCodeString(test_source_code: string);

     /**
      * Remove any TestInfo object with an index greater than 0 from the clipboard,
      * and place them in the results array.
     */
     harness_flushClipboard(): void;

     /**
      * Returns an array of completed TestInfo objects
      */
     harness_getResults();

     /**
      * Replace console.log with an internal logger that pushes
      * messages to TestInfo~log array
      */
     harness_overrideLog(): void;

     /**
      * Restores console.log back to its original function
      */
     harness_restoreLog(): void;

     /**
      * Public TestHarness interface
      */
     harness: TestHarness;
}

/**
 * Provides methods and properties that are used during test execution.
 */
export interface TestHarness {
     /**
      * Absolute URL string of the source file of the active test
      */
     readonly source_location: string;

     /**
      * The root directory for source files. Files outside this location should
      * not be accessed for reporting
      */
     readonly working_directory: string;

     /**
      * Source file code of the active Test
      */
     readonly test_source_code: string;

     /**
     * String JSON
     */
     readonly test_source_map: SourceMap;

     /**
      * Stack storing user registered time points;
      */
     time_points: number[];

     /**
      * Timestamp 
      */
     last_time: number;

     /**
      * Converts a value into a reportable string.
      *
      * @param {any} value - Any value that should be turned into string
      * that can be used in a error message.
      */
     makeLiteral: (value: any) => string;

     /**
      * Test whether a function call throws an error
      * 
      * @param {Function} fn - A function that will be called.
      * @returns {boolean} - `true` if the function threw an exception.
      */
     throws: (value_range: [(...any: any[]) => any, ...any[]]) => boolean | Promise<boolean>;

     /**
      * Test whether a function call throws an error
      * 
      * @param {Function} fn - A function that will be called.
      * @returns {boolean} - `true` if the function threw an exception.
      */
     doesNotThrow: (value_range: [(...any: any[]) => any, ...any[]]) => boolean | Promise<boolean>;

     /**
      * Tests the equality of two values.
      *
      * If the values are objects, then `equal` from `deep-equal` is
      * used to determine of the values are similar.
      *
      * The values harness.regA and harness.regB are set to the values of a and b, respectively.
      *
      * @param {any} a - A value of any type.
      * @param {any} b - A value of any type.
      *
      * @returns {boolean} - `true` if the two values are the same.
      */
     equal: (a: any, b: any) => boolean;

     /**
      * Test whether two values are truthy
      */
     and: (a: any, b: any) => boolean;

     /**
      * Test whether at least one of two values is truthy
      */
     or: (a: any, b: any) => boolean;

     /**
      * Tests the equality of two values.
      *
      * If the values are objects, then `equal` from `deep-equal` is
      * used to determine of the values are similar.
      *
      * The values harness.regA and harness.regB are set to the values of a and b, respectively.
      *
      * @param {any} a - A value of any type.
      * @param {any} b - A value of any type.
      *
      * @returns {boolean} - `true` if the two values are different.
      */
     notEqual: (a, b) => boolean;

     /**
      * Handles the assertion thrown from an external library.
      *
      * @param {Function} fn - A function that will be called.
      * @returns {boolean} - `true` if the function threw an exception.
      */
     externAssertion: (fn: Function) => boolean;

     /**
      * Add error to test harness.
      */
     addException: (e: Error | TransferableTestError) => void;

     /**
      * Appends inspection error to the test errors array
      * for review
      * 
      * @param {any[]} vals - Spread of all arguments passed 
      * to the function.
      */
     inspect: (...vals: any[]) => void;

     /**
      * Retrieve a range of values from the test queue
      * and place in an array
      */
     getValueRange: (start: number, end: number) => any[];

     /**
      * Creates a new TestResult object and pushes it to
      * the top of the test clipboard stack, which makes it the
      * active test frame. All data pertaining to a test
      * is then stored in this object. 
      */
     pushTestResult: (exception_handler_id?: number) => void;

     /**
      * Remove the top most TestResult from the test clipboard stack
      * and adds it to the completed TestResult array.
      */
     popTestResult: () => void;

     /**
      * Set the name of the test frame if it has not already been assigned
      */
     setResultName(name: string): void;

     /**
      * Pushes a value to the harness test_data_stack. 
      * Also pushes an inspection string of the value to the TestInfo test_stack
      * @param any 
      */
     pushValue(any);

     /**
      * Retrieves value from the test_data_stack at index
      * @param any 
      */
     getValue(index: number): any;

     /**
      * Pushes a boolean value to the test_data_stack and the active TestInfo stack.
      * If the boolean value is false, then the active TestInfo~PASSED property is 
      * set to false;
      * @param boolean 
      */
     pushAndAssertValue(success: boolean): any;
}

