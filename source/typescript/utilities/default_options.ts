import { TestFrameOptions } from "../types/test_frame";

export const DefaultOptions: TestFrameOptions = {
    test_dir: "",
    PRELOAD_IMPORTS: false,
    WATCH: false,
    number_of_workers: 1,
    assertion_compilers: [],
    max_timeout: 2000
};
