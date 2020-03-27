import { RawTestRig } from "./raw_test";
import { ImportModule } from "./import_module";

export interface CompileResults {

    imports: ImportModule[];

    raw_tests: RawTestRig[];

    error?: Error;
};
