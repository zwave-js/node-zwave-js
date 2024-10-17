import { BasicCCSet, SupervisionCC, SupervisionCCReport } from "@zwave-js/cc";
import { SupervisionStatus } from "@zwave-js/core";
import test from "ava";

test("SupervisionCCGet should expect a response", (t) => {
	const ccRequest = SupervisionCC.encapsulate(
		new BasicCCSet({
			nodeId: 2,
			targetValue: 5,
		}),
		1,
	);
	t.true(ccRequest.expectsCCResponse());
});

test("SupervisionCC/BasicCCSet => SupervisionCCReport (correct session ID) = expected", (t) => {
	const ccRequest = SupervisionCC.encapsulate(
		new BasicCCSet({
			nodeId: 2,
			targetValue: 5,
		}),
		2,
	);
	const ccResponse = new SupervisionCCReport({
		nodeId: 2,
		moreUpdatesFollow: false,
		sessionId: ccRequest.sessionId,
		status: SupervisionStatus.Success,
	});

	t.true(ccRequest.isExpectedCCResponse(ccResponse));
});

test("SupervisionCC/BasicCCSet => SupervisionCCReport (wrong session ID) = unexpected", (t) => {
	const ccRequest = SupervisionCC.encapsulate(
		new BasicCCSet({
			nodeId: 2,
			targetValue: 5,
		}),
		3,
	);
	const ccResponse = new SupervisionCCReport({
		nodeId: 2,
		moreUpdatesFollow: false,
		sessionId: ccRequest.sessionId + 1,
		status: SupervisionStatus.Success,
	});

	t.false(ccRequest.isExpectedCCResponse(ccResponse));
});
