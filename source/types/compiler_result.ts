import { RawTest } from "./raw_test";
import { ImportDependNode } from "./import_depend_node";

export type CompileResults = {

    imports: ImportDependNode[];

    raw_tests: RawTest[];

    error?: Error;
};
