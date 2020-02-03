import getName from "./get_name.js";

export default function runTest(test, runner_data = {}) {
	return new Promise(async res => {
		let FAILURE = false,
			SUCCESS = false;

		let i = setTimeout(() => {
			if (!SUCCESS) {

				FAILURE = true;

				runner_data.push({ name: getName(test), type: "FAILED", msg: "TIMEOUT", scope: test, failure: "TIMED OUT" })

				res()
			}
		}, 2000)

		if (test) {

			if (test.READY)
				try {
					let result = { FAILED: false, name: getName(test), type: "TEST_SUCCESS", scope: test, failure: null };

						await test.action();

					if (FAILURE) return;

					clearTimeout(i);

					runner_data.results.push(result)

					res(result);
				} catch (e) {

					if (FAILURE) return;

					clearTimeout(i);

					let result = { FAILED: true, name: getName(test), type: "TEST_FAILURE", scope: test, failure: e };

					runner_data.results.push(result)

					res(result);
				}

		}
	})
}