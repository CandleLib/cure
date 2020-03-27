/**
 * An object of options that can be passed to the createTestFrame function.
 */
export interface TestFrameOptions {
    /**
     * Set to `true` to enable file watching features.
     * 
     * @default false
     */
    WATCH?: boolean;

    /**
     * Number of workers threads to use to run tests concurrently.
     * 
    * @default 2
     */
    number_of_workers?: number;

    /**
     * Additional  {@link #AssertionSiteCompiler} to use to compile assertion sites.
     * These will receive selection priority over the built in {@link AssertionSiteCompiler AssertionSiteCompilers}.
     */
    assertion_compilers?: [];

    /**
     * Wait for loading, parsing and linking of all relative imported files before testing. 
     * May slow down initial loading of tests.
     * 
     * @default false
     */
    PRELOAD_IMPORTS?: boolean;
}
