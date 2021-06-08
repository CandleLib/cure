/**
 * Draws text to terminal. Updates to this object
 * will clear console buffer and resubmit all data.
 */
export class CLITextDraw {

    /**
     * Internal string buffer of lines to draw to
     * to stdout.
     * @private
     */
    private buffer: string;
    private error_buffer: string;

    /**
     * Symbol used to separate lines.
     *
     * Defaults to `\n`
     */
    delimiter: string;

    S: boolean;

    /**
     * If true then the screen will be cleared
     * before drawing to it. 
     */
    CLEAR_SCREEN: boolean;

    constructor() {
        this.buffer = "";
        this.delimiter = "\n";
        this.S = false;
        this.timer = 0;
        this.CLEAR_SCREEN = true;

        if (typeof process.stdout.cursorTo != "function")
            this.CLEAR_SCREEN = false;
    }

    addLines(...lines) {
        const out_lines = lines.join(this.delimiter);

        if (this.buffer)
            this.buffer += "\n";

        this.buffer += out_lines;
    }

    async print() {
        if (this.S) return;
        this.S = true;
        const buffer = this.buffer;
        this.buffer = "";

        if (this.CLEAR_SCREEN) {

            new Promise(res => {
                process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");;
                process.stdout.cursorTo(0, 0, () => {
                    process.stdout.clearScreenDown(() => {
                        process.stdout.cursorTo(0, 0, () => {
                            process.stdout.write(buffer, () => {
                                res(0);
                                this.S = false;
                            });;
                        });
                    });
                });
            });
        } else {

            const print = console.log.bind(console);

            buffer.split("\n").map(print);
        }
    }

    log(...data) {
        this.addLines(...data);
        //spark.queueUpdate(this);
    }

    clear() {
        this.buffer = "";
    }
}