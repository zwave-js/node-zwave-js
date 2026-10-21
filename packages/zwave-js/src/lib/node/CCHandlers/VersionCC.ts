import type {
	PersistValuesContext,
	VersionCCCapabilitiesGet,
	VersionCCCommandClassGet,
	VersionCCGet,
} from "@zwave-js/cc";
import {
	CommandClasses,
	EncapsulationFlags,
	type LogNode,
	ZWaveLibraryTypes,
} from "@zwave-js/core";
import semverParse from "semver/functions/parse.js";

import type { ZWaveController } from "../../controller/Controller.js";
import { libVersion } from "../../driver/Driver.js";
import type { ZWaveOptions } from "../../driver/ZWaveOptions.js";
import type { ZWaveNode } from "../Node.js";

export async function handleVersionGet(
	ctx: PersistValuesContext & LogNode,
	controller: ZWaveController,
	node: ZWaveNode,
	command: VersionCCGet,
	vendorInfo: ZWaveOptions["vendor"],
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint.createAPI(CommandClasses.Version, false).withOptions({
		// Answer with the same encapsulation as asked, but omit
		// Supervision as it shouldn't be used for Get-Report flows
		encapsulationFlags:
			command.encapsulationFlags & ~EncapsulationFlags.Supervision,
	});

	const firmwareVersion1 = semverParse(libVersion, { loose: true })!;

	try {
		await api.sendReport({
			libraryType: ZWaveLibraryTypes["Static Controller"],
			protocolVersion: controller.protocolVersion!,
			firmwareVersions: [
				// Firmware 0 is the Z-Wave chip firmware
				controller.firmwareVersion!,
				// Firmware 1 is Z-Wave JS itself
				`${firmwareVersion1.major}.${firmwareVersion1.minor}.${firmwareVersion1.patch}`,
			],
			hardwareVersion: vendorInfo?.hardwareVersion,
		});
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export async function handleVersionCommandClassGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: VersionCCCommandClassGet,
	reportVersion?: number,
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint.createAPI(CommandClasses.Version, false).withOptions({
		// Answer with the same encapsulation as asked, but omit
		// Supervision as it shouldn't be used for Get-Report flows
		encapsulationFlags:
			command.encapsulationFlags & ~EncapsulationFlags.Supervision,
	});

	try {
		await api.reportCCVersion(command.requestedCC, reportVersion);
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export async function handleVersionCapabilitiesGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: VersionCCCapabilitiesGet,
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint.createAPI(CommandClasses.Version, false).withOptions({
		// Answer with the same encapsulation as asked, but omit
		// Supervision as it shouldn't be used for Get-Report flows
		encapsulationFlags:
			command.encapsulationFlags & ~EncapsulationFlags.Supervision,
	});

	try {
		await api.reportCapabilities();
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}
