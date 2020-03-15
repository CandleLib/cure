import URL from "@candlefw/url";

export class TestAssertionError {
    name: string;
    IS_TEST_ERROR: boolean;
    match_source: string;
    replace_source: string;
    message: string;

    line: number;

    column: number;

    origin: string;


    constructor(message, line, column, match_source, replace_source) {

        this.origin = "";
        this.name = "TestAssertionError";
        this.IS_TEST_ERROR = true;
        this.line = line;
        this.column = column;
        this.match_source = match_source;
        this.replace_source = replace_source;

        if (message instanceof Error) {
            const error: Error = message;
            const error_frame = error.stack.split("\n")[1];
            const start = error_frame.indexOf("(");
            const end = error_frame.lastIndexOf(")");
            let data = error_frame.slice(start + 1, end).split(",")[0].split(":");

            this.message = error.message;

            if (data[0] == "file") {
                data = [data[0] + ":" + data[1], data[2], data[3]];
                this.origin = (new URL(data[0])).path;
                this.line = parseInt(data[1]) - 1;
                this.column = parseInt(data[2]) - 1;
            }

            if (data[0] == "<anonymous>") {
            }

        } else {
            this.message = message;
        }
    }
}
