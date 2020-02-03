import getName from "./get_name.js";
import runner from "./runner.js";

export { runner };

const frame = [];

function getCurrentScope() {
	if (frame.length > 0)
		return frame.slice().pop();
	else return { name: "", children: runner.runs };
}

const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

function preProcessError(e) {
	let s = e.scope;

	if (s)
		e.name = getName(s);

	switch (e.type) {
		case "prem":
			console.error(`Action [${e.name}] threw a premature error:\n\t ${e.error}`);
			break;
		case "mal":
			console.error(`Action [${e.name}] threw a malformed error:\n\t ${e.error}`);
		default:
			return true;
	}
}

const pending_actions = new Set;

runner.INITIALIZED = false;

let GLOBAL_ONLY = false;

export const ctest = (function(name, action_function, ONLY = false, SKIP = false) {

	const scope = getCurrentScope();

	scope.children.push({
		parent: scope.name ? scope : null,
		name,
		children: [],
		tests: [],
		action: (action_function) ? async (scope) => { frame.push(scope), await action_function(), frame.pop() } : () => { throw "Action not defined for this test" },
		async: action_function instanceof AsyncFunction,
		READY: true,
		SKIPPED: (!action_function) || SKIP || (GLOBAL_ONLY && !ONLY)
	});
})

ctest.only = (n, a) => ctest(n, a, 1);

ctest.skip = (n, a) => ctest(n, a, 0, 1);

ctest.after = function(action) {
	const scope = getCurrentScope();
	//throw ({ name: scope.name, type: "mal", error: "This is a test" })
}

ctest.before = function(action) {

}