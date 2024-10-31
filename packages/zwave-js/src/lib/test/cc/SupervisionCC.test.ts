import { BasicCCSet, SupervisionCC, SupervisionCCReport } from "@zwave-js/cc";
import { SupervisionStatus } from "@zwave-js/core";
import { test } from "vitest";

test("SupervisionCCGet should expect a response", (t) => {
	const ccRequest = SupervisionCC.encapsulate(
		new BasicCCSet({
			nodeId: 2,
			targetValue: 5,
		}),
		1,
	);
	t.expect(ccRequest.expectsCCResponse()).toBe(true);
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

	t.expect(ccRequest.isExpectedCCResponse(ccResponse)).toBe(true);
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

	t.expect(ccRequest.isExpectedCCResponse(ccResponse)).toBe(false);
});
