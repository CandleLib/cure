import { AssertionSite } from "./assertion_site.js";
import { StatementProp } from "./statement_props";

export type TestClosure = {
    assertion_site: AssertionSite;
    data: StatementProp;
    offset: number;
};
