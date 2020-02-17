#!/usr/bin/env node

import { runner, ctest } from "../source/test.js"

//NodeJS stuff
import path from "path";

//For Test Runners
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";

//For Nearly Accurate Metrics
import { performance } from "perf_hooks";


if (!isMainThread) {

	//Load test file
	const { js_module } = workerData;

	global.ctest = ctest;
	global.it = ctest;
	global.describe = ctest;

	//run test file

	// Colors
	const gray_b = "\x1b[48;5;233m";
	const grn_b = "\x1b[48;5;100m";
	const prpl_b = "\x1b[48;5;57m";
	const drk_orng_b = "\x1b[48;5;88m";
	const red_f = "\x1b[38;5;196m";
	const COLOR_ERROR = `\x1b[41m`,
		COLOR_KEYBOARD = `\x1b[38;5;15m\x1b[48;5;246m`,
		COLOR_SUCCESS = `\x1b[38;5;30m`,
		COLOR_RESET = `\x1b[0m`;

	async function runHandler(runner) {
		try {

			const result = await import(js_module);

			let failures = 0;

			//const number_of_tests = runner.test_count();

			for await (const msg of runner()) {
				switch (msg.type) {
					case "SUITE_START":
						console.log(msg.name)
						break;
					case "TEST_SUCCESS":
						console.log(`\t${COLOR_SUCCESS} \u2713${COLOR_RESET} ${msg.name}`)
						break;
					case "TEST_FAILURE":
						console.log(`\t${COLOR_ERROR} \u2717${COLOR_RESET} ${msg.name.replace("\n","")}`)
						failures++;
						break;
				}
			}

			console.log(`\nSuccessfull tests: ${runner.result.tests - runner.result.failures}. Failed tests: ${runner.result.failures}`)

			for (const r of runner.result.results) {
				if (r.FAILED) {
					console.log(`- \n${COLOR_ERROR} Test ${drk_orng_b}[${r.name}]${COLOR_ERROR} failed: ${COLOR_RESET}`)
					console.log("\t" + (r.failure.stack ? r.failure.stack.replace(/file:\/\//g, "file:/") : r.failure))
				}

			}



			parentPort.postMessage({
				type: "result",
				FAILED: runner.result.results.reduce((r, v) => r + !!v.FAILED, 0) > 0
			});
		} catch (e) {
			parentPort.postMessage({
				type: "result",
				msg: e.message + e.stack,
				FAILED: 1
			});
		}
	}

	runHandler(runner)

} else {

	//Load args and prepare to run test scripts
	const test_script = process.argv.slice().pop();

	const args = process.argv
		.slice(2, process.argv.length - 1)
		.map((v, i, a) => v[0] == "-" ? [v, a[i + 1]] : null)
		.filter(v => !!v)
		.map((v) => ({ arg: v[0].split("-").filter(v => !!v).join("-"), val: v[1] }))
		.reduce((o, v) => Object.assign(o, {
			[v.arg]: v.val
		}), {})

	const js_module = path.join(process.cwd(), test_script)
	//*
	const worker = new Worker((new URL(
		import.meta.url)).pathname, {
		workerData: { js_module }
	})

	let SUCCESS = true;

	worker.on("exit", exitCode => {
		if (!SUCCESS)
			process.exit(-255)
	})

	worker.on("message", (e, d) => {
		switch (e.type) {
			case "result":
				SUCCESS = !e.FAILED;
				console.log(e.msg)
				break;
		}
	})
}