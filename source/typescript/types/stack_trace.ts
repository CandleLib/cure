import URL from "@candlelib/url";

/* END -------------------------------------------------------------------------------------------- END */
export interface StackTraceLocation {
    type: "location";

    url: URL | "anonymous";

    pos: [number, number, number?];

    sub_stack: undefined;
}
export interface StackTraceCall {
    type: "call";
    call_id: string;
    sub_stack: (StackTraceCall | StackTraceLocation)[];
}

export type StackTraceAst = StackTraceCall | StackTraceLocation;
