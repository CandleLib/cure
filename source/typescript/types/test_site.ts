import { AssertionSite } from "./assertion_site.js";
import { StatementProp } from "./statement_props";

export type TestSite = {
    assertion_site: AssertionSite;
    data: StatementProp;
    offset: number;
};
