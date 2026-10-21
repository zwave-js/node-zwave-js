import {
	type PersistValuesContext,
	Powerlevel,
	type PowerlevelCCGet,
	type PowerlevelCCSet,
	type PowerlevelCCTestNodeGet,
	type PowerlevelCCTestNodeReport,
	type PowerlevelCCTestNodeSet,
	PowerlevelTestStatus,
} from "@zwave-js/cc";
import {
	CommandClasses,
	EncapsulationFlags,
	type LogNode,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { noop, pick } from "@zwave-js/shared";

import type { Driver } from "../../driver/Driver.js";
import type { ZWaveNode } from "../Node.js";

export function handlePowerlevelSet(
	driver: Driver,
	node: ZWaveNode,
	command: PowerlevelCCSet,
): void {
	// Check if the powerlevel is valid
	if (!(command.powerlevel in Powerlevel)) {
		throw new ZWaveError(
			`Invalid powerlevel ${command.powerlevel}.`,
			ZWaveErrorCodes.CC_OperationFailed,
		);
	}

	// CC:0073.01.01.11.001: A supporting node MAY decide not to change its actual Tx configuration.
	// In any case, the value received in this Command MUST be returned in a Powerlevel Report Command
	// in response to a Powerlevel Get Command as if the power setting was accepted for the indicated duration.
	driver.controller.powerlevel = {
		powerlevel: command.powerlevel,
		until: command.timeout
			? new Date(Date.now() + command.timeout * 1000)
			: new Date(),
	};
}

export async function handlePowerlevelGet(
	driver: Driver,
	node: ZWaveNode,
	command: PowerlevelCCGet,
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses.Powerlevel, false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	const { powerlevel, until } = driver.controller.powerlevel;

	try {
		if (
			// Setting elapsed
			until.getTime() < Date.now()
			// or it is already set to normal power
			|| powerlevel === Powerlevel["Normal Power"]
		) {
			await api.reportPowerlevel({
				powerlevel: Powerlevel["Normal Power"],
			});
		} else {
			const timeoutSeconds = Math.max(
				0,
				Math.min(
					Math.round((until.getTime() - Date.now()) / 1000),
					255,
				),
			);

			await api.reportPowerlevel({
				powerlevel,
				timeout: timeoutSeconds,
			});
		}
	} catch (e: any) {
		driver.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export async function handlePowerlevelTestNodeSet(
	driver: Driver,
	node: ZWaveNode,
	command: PowerlevelCCTestNodeSet,
): Promise<void> {
	// Check if the powerlevel is valid
	if (!(command.powerlevel in Powerlevel)) {
		throw new ZWaveError(
			`Invalid powerlevel ${command.powerlevel}.`,
			ZWaveErrorCodes.CC_OperationFailed,
		);
	} else if (command.testFrameCount < 1) {
		throw new ZWaveError(
			"testFrameCount must be at least 1",
			ZWaveErrorCodes.CC_OperationFailed,
		);
	}

	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses.Powerlevel, false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	try {
		const acknowledgedFrames = await driver.sendNOPPowerFrames(
			command.testNodeId,
			command.powerlevel,
			command.testFrameCount,
		);
		// Test results are in, send report
		void api
			.sendNodeTestReport({
				status:
					acknowledgedFrames > 0
						? PowerlevelTestStatus.Success
						: PowerlevelTestStatus.Failed,
				testNodeId: command.testNodeId,
				acknowledgedFrames,
			})
			.catch(noop);
	} catch {
		// Test failed for some reason (e.g. invalid node)
		void api
			.sendNodeTestReport({
				status: PowerlevelTestStatus.Failed,
				testNodeId: command.testNodeId,
				acknowledgedFrames: 0,
			})
			.catch(noop);
	}
}

export async function handlePowerlevelTestNodeGet(
	driver: Driver,
	node: ZWaveNode,
	command: PowerlevelCCTestNodeGet,
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses.Powerlevel, false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	const status = driver.getNOPPowerTestStatus();

	try {
		if (status) {
			await api.sendNodeTestReport({
				status: status.inProgress
					? PowerlevelTestStatus["In Progress"]
					: status.acknowledgedFrames > 0
						? PowerlevelTestStatus.Success
						: PowerlevelTestStatus.Failed,
				...status,
			});
		} else {
			// No test was done
			await api.sendNodeTestReport({
				status: PowerlevelTestStatus.Success,
				testNodeId: 0,
				acknowledgedFrames: 0,
			});
		}
	} catch (e: any) {
		driver.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export function handlePowerlevelTestNodeReport(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: PowerlevelCCTestNodeReport,
): void {
	// Notify listeners
	node.emit(
		"notification",
		node,
		CommandClasses.Powerlevel,
		pick(command, ["testNodeId", "status", "acknowledgedFrames"]),
	);
}
