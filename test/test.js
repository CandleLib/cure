import chai from "chai";

import getName from "../source/get_name.js";

chai.should();

ctest("basic unit tests", () => {
	ctest("getName", () => {
		var t = 3;
		ctest("getNames", () => {
			console.log(112)
			const scope = {};
			(1 + 2).should.equal(0);
		})

		ctest("getNames2", () => {
			const scope = {};
			(1 + 2).should.equal(3);
		})
	})
})