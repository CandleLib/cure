import { TestSuite } from "../types/test_suite.js";


export function createTestSuite(url_string: string, index: number): TestSuite {
    return {
        origin: url_string,
        tests: [],
        index,
        data: "",
        name: "",
        url: null
    };
}
