import { RawTest } from "./raw_test";
import { ImportDependNode } from "./ImportDependNode";

export type CompileResults = {

    imports: ImportDependNode[];

    raw_tests: RawTest[];

    error?: Error;
};
