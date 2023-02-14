import { BasicCCSet, SupervisionCC, SupervisionCCReport } from "@zwave-js/cc";
import { SupervisionStatus } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

test("SupervisionCCGet should expect a response", (t) => {
	const ccRequest = SupervisionCC.encapsulate(
		host,
		new BasicCCSet(host, {
			nodeId: 2,
			targetValue: 5,
		}),
	);
	t.true(ccRequest.expectsCCResponse());
});

test("SupervisionCC/BasicCCSet => SupervisionCCReport (correct session ID) = expected", (t) => {
	const ccRequest = SupervisionCC.encapsulate(
		host,
		new BasicCCSet(host, {
			nodeId: 2,
			targetValue: 5,
		}),
	);
	const ccResponse = new SupervisionCCReport(host, {
		nodeId: 2,
		moreUpdatesFollow: false,
		sessionId: ccRequest.sessionId,
		status: SupervisionStatus.Success,
	});

	t.true(ccRequest.isExpectedCCResponse(ccResponse));
});

test("SupervisionCC/BasicCCSet => SupervisionCCReport (wrong session ID) = unexpected", (t) => {
	const ccRequest = SupervisionCC.encapsulate(
		host,
		new BasicCCSet(host, {
			nodeId: 2,
			targetValue: 5,
		}),
	);
	const ccResponse = new SupervisionCCReport(host, {
		nodeId: 2,
		moreUpdatesFollow: false,
		sessionId: ccRequest.sessionId + 1,
		status: SupervisionStatus.Success,
	});

	t.false(ccRequest.isExpectedCCResponse(ccResponse));
});
