import { assert, expect } from "chai";
import { SinonFakeTimers, spy, useFakeTimers } from "sinon";
import { promisify, promisifyNoError, wait } from "./promises";
// tslint:disable:no-unused-expression

function callbackApiWithError(returnError: boolean, callback: (err: any, result?: boolean) => void) {
	if (returnError) {
		callback(new Error("you wanted an error!"));
	} else {
		callback(null, true);
	}
}

function callbackApiWithoutError(callback: (result: boolean) => void) {
	callback(true);
}

describe("lib/promises => promisify()", () => {
	const promisifiedApi = promisify<boolean>(callbackApiWithError);

	it("should throw", async () => {
		try {
			await promisifiedApi(true);
			assert(false, "it didn't throw");
		} catch (e) {
			assert(true);
		}
	});

	it("shouldn't throw", async () => {
		try {
			await promisifiedApi(false);
			assert(true);
		} catch (e) {
			assert(false, "it did throw");
		}
	});

});

describe("lib/promises => promisifyNoError()", () => {
	const promisifiedApi = promisifyNoError<boolean>(callbackApiWithoutError);

	it("shouldn't throw", async () => {
		try {
			await promisifiedApi();
			assert(true);
		} catch (e) {
			assert(false, "it did throw");
		}
	});
});

describe("lib/promises => wait()", () => {

	let clock: SinonFakeTimers;
	beforeEach(() => {
		clock = useFakeTimers();
	});

	const timeout = 100;

	it(`wait(${timeout}) should wait ${timeout} ms`, (done) => {

		const leSpy = spy();

		wait(timeout).then(() => {
			expect(Date.now()).to.equal(timeout);
			done();
		});
		clock.runAll();

	});

	afterEach(() => {
		clock.restore();
	});
});
