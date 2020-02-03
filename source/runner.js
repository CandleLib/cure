import runTest from "./run_test.js";
import getName from "./get_name.js";

const runs = [];

async function* runRunner(run, runner_data) {
	
	let failure = null;

	try {
		await run.action(run);
	} catch (e) {
		failure = e;
	}

	const IS_TEST = run.children.length == 0;

	if (IS_TEST) {
		runner_data.tests++;
		if (failure) {
			runner_data.failures++;
			yield { FAILED: true, name: getName(run), type: "TEST_FAILURE", scope: run, failure: failure };
			runner_data.results.push({ FAILED: true, name: getName(run), type: "TEST_FAILURE", scope: run, failure: failure })
		} else{
			yield { FAILED: false, name: getName(run), type: "TEST_SUCCESS", scope: run, failure: null };
			runner_data.results.push({ FAILED: false, name: getName(run), type: "TEST_SUCCESS", scope: run, failure: null })
		}
	} else if (failure) {
		yield { FAILED: true, name: getName(run), type: "SUITE_FAILURE", scope: run, failure: failure };
	}

	if(!IS_TEST) yield { type: "SUITE_START", scope: run, name:run.name };
	
	for (const test of run.tests) {
		yield await runner(run.children, runner_data);
	}

	for (const child of run.children) yield* await runRunner(child, runner_data);

	if(!IS_TEST)  yield { type: "SUITE_END", scope: run };
}

export default async function* runner(r = runs, data = { results: [], tests: 0, failures: 0 }) {

	for (const run of r)
		yield*(await runRunner(run, data));

	runner.result = data;

	return data;
}

runner.runs = runs;

function getCount(run, count = 0) {
	for (const test of run.tests)
		count++;
	for (const child of run.children)
		count = getCount(child, count);
	return count;
}

runner.test_count = function(count = 0) {
	for (const run of runs)
		count = getCount(run, count)
	return count;
}