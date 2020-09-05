import spark from "@candlefw/spark";
/**
 * Draws text to terminal. Updates to this object
 * will clear console buffer and redraw all data.
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

    constructor() {
        this.buffer = "";
        this.delimiter = "\n";
        this.S = false;
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
        return new Promise(res => {
            console.clear();
            process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
            process.stdout.cursorTo(0, 0, () => {
                process.stdout.clearScreenDown(() => {
                    process.stdin.write(this.buffer, () => {
                        this.S = false;
                        res();
                    });
                });
            });
        });
    }

    log(...data) {
        this.addLines(...data);
        //spark.queueUpdate(this);
    }

    clear() {
        this.buffer = "";
    }
}