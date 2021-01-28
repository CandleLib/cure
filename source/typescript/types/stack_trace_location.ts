export type StackTraceLocation = {
    type: "URL";
    col: number;
    line: number;
    protocol: string;
    url: string;
} | {
    type: "ANONYMOUS";
    col: number;
    line: number;
};
