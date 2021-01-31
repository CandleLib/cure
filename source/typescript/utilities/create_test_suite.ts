import { TestSuite } from "../types/test_suite.js";
import { THROWABLE_TEST_OBJECT_ID } from "./throwable_test_object_enum.js";


export function createTestSuite(url_string: string, index: number): TestSuite {
    return {
        throwable_id: THROWABLE_TEST_OBJECT_ID.TEST_SUITE,
        origin: url_string,
        tests: [],
        index,
        data: "",
        name: "",
        url: null
    };
}
