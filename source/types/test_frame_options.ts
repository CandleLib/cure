/**
 * An Object of options that can be passed to the createTestFrame function.
 */
export interface TestFrameOptions {
    /**
     * Set to `true` to enable file watching features.
     */
    WATCH?: boolean;
    /**
     * Number of workers threads to use to run tests concurrently.
     */
    number_of_workers?: 2;
    /**
     * Additional  {@link #AssertionSiteCompiler} to use to compile assertion sites.
     * These will receive selection priority over the built in {@link AssertionSiteCompiler AssertionSiteCompilers}.
     */
    assertion_compilers?: [];
}