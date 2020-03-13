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

    /**
     * Symbol used to separate lines.
     *
     * Defaults to `\n`
     */
    delimiter: string;

    constructor() {
        this.buffer = "";
        this.delimiter = "\n";
    }

    addLines(...lines) {
        const out_lines = lines.join(this.delimiter);
        if (this.buffer)
            this.buffer += "\n";
        this.buffer += out_lines;
    }

    scheduledUpdate() {
        process.stdout.cursorTo(0, 0, () => {
            process.stdout.clearScreenDown(() => {
                process.stdin.write(this.buffer);
            });
        });
    }

    log(...data) {
        this.addLines(...data);
        spark.queueUpdate(this);
    }

    clear() {
        this.buffer = "";
    }
}