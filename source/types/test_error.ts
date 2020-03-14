export class TestAssertionError {
    IS_TEST_ERROR: boolean;
    match_source: string;
    replace_source: string;
    message: string;

    line: number;

    column: number;


    constructor(message, line, column, match_source, replace_source) {
        this.IS_TEST_ERROR = true;
        this.message = message;
        this.line = line;
        this.column = column;
        this.match_source = match_source;
        this.replace_source = replace_source;
    }
}
