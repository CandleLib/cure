/**
 * Be careful about modifying this file. Some tests rely on the line numbers of statements within this file
 * and will fail if new content is added that changes line position of those statements. 
 * Formating may also have a similar effect, and for consistency the formatting applied to this document 
 * should not create or remove lines of code, and should use 4 space tab stops.
 */
import { createTransferableTestErrorFromException, seekSourceFile } from "../build/library/utilities/test_error.js";
import { testThrow } from "../build/library/utilities/testThrow.js";
import { ExternalThrowB } from "./data/external_throw.js";

assert_group(skip, "Error Thrown From The Spec File", sequence, () => {
    try {
        throw new Error("Help");
    } catch (e) {
        assert("Reported line of error is correct", createTransferableTestErrorFromException(e, harness).line == 13);
        assert("Reported column of error is correct", createTransferableTestErrorFromException(e, harness).column == 15);
    }
});

assert_group(skip, "Error Thrown From External File In Working Directory", sequence, () => {
    try {
        ExternalThrowB();
    } catch (e) {
        assert("Reported line of error is correct", createTransferableTestErrorFromException(e, harness).line == 13);
        assert("Reported column of error is correct", createTransferableTestErrorFromException(e, harness).column == 42);
    }
});

assert_group(skip, "Error Thrown From Source Mapped File In Working Directory", sequence, () => {

    try {
        testThrow();
    } catch (e) {

        const test_error = createTransferableTestErrorFromException(e, harness);
        const source = await seekSourceFile(test_error, harness);

        assert("Reported line of error is correct", source.line == 22);
        assert("Reported column of error is correct", source.column == 60);
    }
});

assert_group(skip, "Error Thrown From File Outside Working Directory. Should Map Back To Spec File", sequence, () => {

    try {
        const lexer = new Lexer();
    } catch (e) {

        const test_error = createTransferableTestErrorFromException(e, harness);
        const source = await seekSourceFile(test_error, harness);


        assert("Reported line of error is correct", source.line == 46);
        assert("Reported column of error is correct", source.column == 23);
    }
});