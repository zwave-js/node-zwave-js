import { getCCConstructor } from "@zwave-js/cc";
import {
	CommandClasses,
	applicationCCs,
	getCCName,
	nonApplicationCCs,
	topologicalSort,
} from "@zwave-js/core";
import { test } from "vitest";
import { ZWaveNode } from "../../node/Node.js";
import { createEmptyMockDriver } from "../mocks.js";

test("the CC interviews happen in the correct order", (t) => {
	t.expect(getCCConstructor(49)).toBeDefined();

	const fakeDriver = createEmptyMockDriver();

	const node = new ZWaveNode(2, fakeDriver as any);
	const CCs = [
		CommandClasses["Z-Wave Plus Info"],
		CommandClasses["Device Reset Locally"],
		CommandClasses["Firmware Update Meta Data"],
		CommandClasses["CRC-16 Encapsulation"],
		CommandClasses["Multi Channel"],
		CommandClasses["Multilevel Switch"],
		CommandClasses.Configuration,
		CommandClasses["Multilevel Sensor"],
		CommandClasses.Meter,
		CommandClasses.Protection,
		CommandClasses.Association,
		CommandClasses["Multi Channel Association"],
		CommandClasses["Association Group Information"],
		CommandClasses.Notification,
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	];
	for (const cc of CCs) {
		node.addCC(cc, { isSupported: true, version: 1 });
	}

	const rootInterviewGraphPart1 = node.buildCCInterviewGraph([
		CommandClasses.Security,
		CommandClasses["Security 2"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
		...applicationCCs,
	]);
	const rootInterviewGraphPart2 = node.buildCCInterviewGraph([
		...nonApplicationCCs,
	]);

	const rootInterviewOrderPart1 = topologicalSort(rootInterviewGraphPart1);
	const rootInterviewOrderPart2 = topologicalSort(rootInterviewGraphPart2);

	t.expect(
		rootInterviewOrderPart1.map((cc) => getCCName(cc)),
	).toStrictEqual([
		"Z-Wave Plus Info",
		"Device Reset Locally",
		"Firmware Update Meta Data",
		"CRC-16 Encapsulation",
		"Multi Channel",
		"Association",
		"Multi Channel Association",
		"Association Group Information",
	]);
	t.expect(
		rootInterviewOrderPart2.map((cc) => getCCName(cc)),
	).toStrictEqual([
		"Multilevel Switch",
		"Configuration",
		"Multilevel Sensor",
		"Meter",
		"Protection",
		"Notification",
	]);
});
