/**
 * Stub functions that mock the actual functionality of Cure's test spec functions.
 * Allows Cure spec sheets to be used outside of the Cure test compiler environment
 * without effecting the compilability of the Spec file. 
 */

const tests = [];


export async function run() {
    if (tests.length > 0) {
        console.warn("Running Cure in STUB MODE. Results may differ from compiled tests.");
        await Promise.all(tests);
    }
}

export function assert(...args: any[]) {
    const test_name = args.filter(s => typeof s == "string")[0] ?? "undefined test" + tests.length;
    tests.push(new Promise(async (res, rej) => {
        console.log(`Running [${test_name}] in STUB MODE`);
        for (let arg of args) {
            switch (typeof arg) {
                case "boolean":
                    if (arg) {
                        console.log(`Test [${test_name}] passed`);
                        res(0);
                    } else {
                        console.log(`Test [${test_name}] failed`);
                        res(1);
                    }
                    return;
                case "function":
                    try {
                        arg();
                        console.log(`Test [${test_name}] passed`);
                        res(0);
                    } catch (e) {
                        console.log(`Test [${test_name}] failed`);
                        res(1);
                    }
                    return;
            }
        }
        rej("No stub tests present");
    }));
}

export function assert_group(...args: any[]) {

    let test_function: (...a: any[]) => any = null;
    const test_name = args.filter(s => typeof s == "string")[0] ?? "undefined test group" + tests.length;
    tests.push(new Promise(async (res, rej) => {

        for (let arg of args) {
            switch (typeof arg) {
                case "function":
                    if (!test_function)
                        test_function = arg;
                    break;
            }
        }

        if (test_function) {
            console.log(`Running ${test_name} in [stub mode]`);
            try {
                await test_function();
                res(0);
            } catch (e) {
                console.log(`Test group ${test_name} failed [stub mode]`);
                res(1);
            }

            return;
        }

        rej("No stub tests present");
    }));
}