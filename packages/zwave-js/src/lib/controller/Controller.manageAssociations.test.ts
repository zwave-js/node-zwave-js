import {
	AssociationCheckResult,
	AssociationGroupInfoCCValues,
	BasicCommand,
	utils as ccUtils,
} from "@zwave-js/cc";
import { CommandClasses, SecurityClass } from "@zwave-js/core/safe";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";
import { createTestNode } from "../test/mocks";

test("associations between insecure nodes are allowed", (t) => {
	// This test simulates two Zooz ZEN76 switches, included insecurely
	const host = createTestingHost({
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			switch (cc) {
				case CommandClasses["Association Group Information"]:
					return 1;
				case CommandClasses.Association:
					return 3;
				case CommandClasses["Multi Channel Association"]:
					return 4;
				case CommandClasses.Basic:
					return 2;
				case CommandClasses["Binary Switch"]:
					return 2;
			}
			return 0;
		},
	});

	const node2 = createTestNode(host, {
		id: 2,
		supportsCC(cc) {
			switch (cc) {
				case CommandClasses["Association Group Information"]:
				case CommandClasses.Association:
				case CommandClasses["Multi Channel Association"]:
				case CommandClasses.Basic:
				case CommandClasses["Binary Switch"]:
					return true;
			}
			return false;
		},
	});
	host.nodes.set(node2.id, node2);

	node2.setSecurityClass(SecurityClass.S0_Legacy, false);
	node2.setSecurityClass(SecurityClass.S2_AccessControl, false);
	node2.setSecurityClass(SecurityClass.S2_Authenticated, false);
	node2.setSecurityClass(SecurityClass.S2_Unauthenticated, false);

	const node3 = createTestNode(host, {
		id: 3,
		supportsCC(cc) {
			switch (cc) {
				case CommandClasses["Association Group Information"]:
				case CommandClasses.Association:
				case CommandClasses["Multi Channel Association"]:
				case CommandClasses.Basic:
				case CommandClasses["Binary Switch"]:
					return true;
			}
			return false;
		},
	});
	host.nodes.set(node3.id, node3);

	node3.setSecurityClass(SecurityClass.S0_Legacy, false);
	node3.setSecurityClass(SecurityClass.S2_AccessControl, false);
	node3.setSecurityClass(SecurityClass.S2_Authenticated, false);
	node3.setSecurityClass(SecurityClass.S2_Unauthenticated, false);

	// Node 2, group 2 sends Basic CC Set
	const groupId = 2;
	const commands = new Map<CommandClasses, number[]>([
		[CommandClasses.Basic, [BasicCommand.Set]],
	]);
	host.getValueDB(node2.id).setValue(
		AssociationGroupInfoCCValues.commands(groupId).endpoint(0),
		commands,
	);

	t.is(
		ccUtils.checkAssociation(host, node2, groupId, {
			nodeId: 3,
		}),
		AssociationCheckResult.OK,
	);
});
