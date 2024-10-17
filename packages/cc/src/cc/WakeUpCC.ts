import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	TransmitOptions,
	ValueMetadata,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCEncodingContext, GetValueDB } from "@zwave-js/host/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { clamp } from "alcalzone-shared/math";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
	type PersistValuesContext,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { WakeUpCommand } from "../lib/_Types";

export const WakeUpCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Wake Up"], {
		...V.staticProperty(
			"controllerNodeId",
			{
				...ValueMetadata.ReadOnly,
				label: "Node ID of the controller",
			} as const,
			{
				supportsEndpoints: false,
			},
		),

		...V.staticProperty(
			"wakeUpInterval",
			{
				...ValueMetadata.UInt24,
				label: "Wake Up interval",
			} as const,
			{
				supportsEndpoints: false,
			},
		),

		...V.staticProperty("wakeUpOnDemandSupported", undefined, {
			internal: true,
			supportsEndpoints: false,
			minVersion: 3,
		}),
	}),
});

@API(CommandClasses["Wake Up"])
export class WakeUpCCAPI extends CCAPI {
	public supportsCommand(cmd: WakeUpCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case WakeUpCommand.IntervalGet:
				return this.isSinglecast();
			case WakeUpCommand.IntervalSet:
			case WakeUpCommand.NoMoreInformation:
				return true; // This is mandatory
			case WakeUpCommand.IntervalCapabilitiesGet:
				return this.version >= 2 && this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(this: WakeUpCCAPI, { property }, value) {
			if (property !== "wakeUpInterval") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			const result = await this.setInterval(
				value,
				this.host.ownNodeId ?? 1,
			);

			// Verify the change after a short delay, unless the command was supervised and successful
			if (this.isSinglecast() && !supervisedCommandSucceeded(result)) {
				this.schedulePoll({ property }, value, { transition: "fast" });
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: WakeUpCCAPI, { property }) {
			switch (property) {
				case "wakeUpInterval":
					return (await this.getInterval())?.[property];
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getInterval() {
		this.assertSupportsCommand(WakeUpCommand, WakeUpCommand.IntervalGet);

		const cc = new WakeUpCCIntervalGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			WakeUpCCIntervalReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["wakeUpInterval", "controllerNodeId"]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getIntervalCapabilities() {
		this.assertSupportsCommand(
			WakeUpCommand,
			WakeUpCommand.IntervalCapabilitiesGet,
		);

		const cc = new WakeUpCCIntervalCapabilitiesGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			WakeUpCCIntervalCapabilitiesReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"defaultWakeUpInterval",
				"minWakeUpInterval",
				"maxWakeUpInterval",
				"wakeUpIntervalSteps",
				"wakeUpOnDemandSupported",
			]);
		}
	}

	@validateArgs()
	public async setInterval(
		wakeUpInterval: number,
		controllerNodeId: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(WakeUpCommand, WakeUpCommand.IntervalSet);

		const cc = new WakeUpCCIntervalSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			wakeUpInterval,
			controllerNodeId,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async sendNoMoreInformation(): Promise<void> {
		this.assertSupportsCommand(
			WakeUpCommand,
			WakeUpCommand.NoMoreInformation,
		);

		const cc = new WakeUpCCNoMoreInformation({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		await this.host.sendCommand(cc, {
			...this.commandOptions,
			// This command must be sent as part of the wake up queue
			priority: MessagePriority.WakeUp,
			// Don't try to resend this - if we get no response, the node is most likely asleep
			maxSendAttempts: 1,
			// Also we don't want to wait for an ACK because this can lock up the network for seconds
			// if the target node is asleep and doesn't respond to the command
			transmitOptions: TransmitOptions.DEFAULT_NOACK,
		});
	}
}

@commandClass(CommandClasses["Wake Up"])
@implementedVersion(3)
@ccValues(WakeUpCCValues)
export class WakeUpCC extends CommandClass {
	declare ccCommand: WakeUpCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Wake Up"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		if (node.id === ctx.ownNodeId) {
			ctx.logNode(
				node.id,
				`skipping wakeup configuration for the controller`,
			);
		} else if (node.isFrequentListening) {
			ctx.logNode(
				node.id,
				`skipping wakeup configuration for frequent listening device`,
			);
		} else {
			let desiredInterval: number;
			let currentControllerNodeId: number;
			let minInterval: number | undefined;
			let maxInterval: number | undefined;

			// Retrieve the allowed wake up intervals and wake on demand support if possible
			if (api.version >= 2) {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"retrieving wakeup capabilities from the device...",
					direction: "outbound",
				});
				const wakeupCaps = await api.getIntervalCapabilities();
				if (wakeupCaps) {
					const logMessage = `received wakeup capabilities:
default wakeup interval: ${wakeupCaps.defaultWakeUpInterval} seconds
minimum wakeup interval: ${wakeupCaps.minWakeUpInterval} seconds
maximum wakeup interval: ${wakeupCaps.maxWakeUpInterval} seconds
wakeup interval steps:   ${wakeupCaps.wakeUpIntervalSteps} seconds
wakeup on demand supported: ${wakeupCaps.wakeUpOnDemandSupported}`;
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: logMessage,
						direction: "inbound",
					});
					minInterval = wakeupCaps.minWakeUpInterval;
					maxInterval = wakeupCaps.maxWakeUpInterval;
				}
			}

			// SDS14223 prescribes a IntervalSet followed by a check
			// We have no intention of changing the interval (maybe some time in the future)
			// So for now get the current interval and just set the controller ID

			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "retrieving wakeup interval from the device...",
				direction: "outbound",
			});
			const wakeupResp = await api.getInterval();

			if (wakeupResp) {
				const logMessage = `received wakeup configuration:
wakeup interval: ${wakeupResp.wakeUpInterval} seconds
controller node: ${wakeupResp.controllerNodeId}`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				desiredInterval = wakeupResp.wakeUpInterval;
				currentControllerNodeId = wakeupResp.controllerNodeId;
			} else {
				// Just guess, I guess
				desiredInterval = 3600 * 6; // 6 hours
				currentControllerNodeId = 0; // assume not set
			}

			const ownNodeId = ctx.ownNodeId;
			// Only change the destination if necessary
			if (currentControllerNodeId !== ownNodeId) {
				// Spec compliance: Limit the interval to the allowed range, but...
				// ...try and preserve a "never wake up" configuration (#6367)
				if (
					desiredInterval !== 0
					&& minInterval != undefined
					&& maxInterval != undefined
				) {
					desiredInterval = clamp(
						desiredInterval,
						minInterval,
						maxInterval,
					);
				}

				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "configuring wakeup destination node",
					direction: "outbound",
				});
				await api.setInterval(desiredInterval, ownNodeId);
				this.setValue(
					ctx,
					WakeUpCCValues.controllerNodeId,
					ownNodeId,
				);
				ctx.logNode(
					node.id,
					"wakeup destination node changed!",
				);
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}
}

// @publicAPI
export interface WakeUpCCIntervalSetOptions extends CCCommandOptions {
	wakeUpInterval: number;
	controllerNodeId: number;
}

@CCCommand(WakeUpCommand.IntervalSet)
@useSupervision()
export class WakeUpCCIntervalSet extends WakeUpCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| WakeUpCCIntervalSetOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 4);
			this.wakeUpInterval = this.payload.readUIntBE(0, 3);
			this.controllerNodeId = this.payload[3];
		} else {
			this.wakeUpInterval = options.wakeUpInterval;
			this.controllerNodeId = options.controllerNodeId;
		}
	}

	public wakeUpInterval: number;
	public controllerNodeId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			0,
			0,
			0, // placeholder
			this.controllerNodeId,
		]);
		this.payload.writeUIntBE(this.wakeUpInterval, 0, 3);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"wake-up interval": `${this.wakeUpInterval} seconds`,
				"controller node id": this.controllerNodeId,
			},
		};
	}
}

@CCCommand(WakeUpCommand.IntervalReport)
export class WakeUpCCIntervalReport extends WakeUpCC {
	public constructor(
		options: CommandClassDeserializationOptions,
	) {
		super(options);

		validatePayload(this.payload.length >= 4);
		this.wakeUpInterval = this.payload.readUIntBE(0, 3);
		this.controllerNodeId = this.payload[3];
	}

	@ccValue(WakeUpCCValues.wakeUpInterval)
	public readonly wakeUpInterval: number;

	@ccValue(WakeUpCCValues.controllerNodeId)
	public readonly controllerNodeId: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"wake-up interval": `${this.wakeUpInterval} seconds`,
				"controller node id": this.controllerNodeId,
			},
		};
	}
}

@CCCommand(WakeUpCommand.IntervalGet)
@expectedCCResponse(WakeUpCCIntervalReport)
export class WakeUpCCIntervalGet extends WakeUpCC {}

@CCCommand(WakeUpCommand.WakeUpNotification)
export class WakeUpCCWakeUpNotification extends WakeUpCC {}

@CCCommand(WakeUpCommand.NoMoreInformation)
export class WakeUpCCNoMoreInformation extends WakeUpCC {}

@CCCommand(WakeUpCommand.IntervalCapabilitiesReport)
export class WakeUpCCIntervalCapabilitiesReport extends WakeUpCC {
	public constructor(
		options: CommandClassDeserializationOptions,
	) {
		super(options);

		validatePayload(this.payload.length >= 12);
		this.minWakeUpInterval = this.payload.readUIntBE(0, 3);
		this.maxWakeUpInterval = this.payload.readUIntBE(3, 3);
		this.defaultWakeUpInterval = this.payload.readUIntBE(6, 3);
		this.wakeUpIntervalSteps = this.payload.readUIntBE(9, 3);

		if (this.payload.length >= 13) {
			// V3+
			this.wakeUpOnDemandSupported = !!(this.payload[12] & 0b1);
		} else {
			this.wakeUpOnDemandSupported = false;
		}
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;
		const valueDB = this.getValueDB(ctx);

		// Store the received information as metadata for the wake up interval
		valueDB.setMetadata(
			{
				commandClass: this.ccId,
				endpoint: this.endpointIndex,
				property: "wakeUpInterval",
			},
			{
				...ValueMetadata.WriteOnlyUInt24,
				min: this.minWakeUpInterval,
				max: this.maxWakeUpInterval,
				steps: this.wakeUpIntervalSteps,
				default: this.defaultWakeUpInterval,
			},
		);

		// Store wakeUpOnDemandSupported in valueDB

		return true;
	}

	public readonly minWakeUpInterval: number;
	public readonly maxWakeUpInterval: number;
	public readonly defaultWakeUpInterval: number;
	public readonly wakeUpIntervalSteps: number;

	@ccValue(WakeUpCCValues.wakeUpOnDemandSupported)
	public readonly wakeUpOnDemandSupported: boolean;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"default interval": `${this.defaultWakeUpInterval} seconds`,
				"minimum interval": `${this.minWakeUpInterval} seconds`,
				"maximum interval": `${this.maxWakeUpInterval} seconds`,
				"interval steps": `${this.wakeUpIntervalSteps} seconds`,
				"wake up on demand supported":
					`${this.wakeUpOnDemandSupported}`,
			},
		};
	}
}

@CCCommand(WakeUpCommand.IntervalCapabilitiesGet)
@expectedCCResponse(WakeUpCCIntervalCapabilitiesReport)
export class WakeUpCCIntervalCapabilitiesGet extends WakeUpCC {}
