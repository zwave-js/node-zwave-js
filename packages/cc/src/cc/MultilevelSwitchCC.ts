import {
	CommandClasses,
	Duration,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	MessageRecord,
	parseMaybeNumber,
	parseNumber,
	unknownNumber,
	validatePayload,
	ValueID,
	ValueMetadata,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	API,
	CCCommand,
	ccValue,
	ccValueMetadata,
	commandClass,
	CommandClass,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
	type CommandClassOptions,
} from "../lib/CommandClass";
import {
	LevelChangeDirection,
	MultilevelSwitchCommand,
	SwitchType,
} from "../lib/_Types";

/**
 * Translates a switch type into two actions that may be performed. Unknown types default to Down/Up
 */
function switchTypeToActions(switchType: string): [down: string, up: string] {
	if (!switchType.includes("/")) switchType = SwitchType[0x02]; // Down/Up
	return switchType.split("/", 2) as any;
}
const switchTypeProperties = Object.keys(SwitchType)
	.filter((key) => key.indexOf("/") > -1)
	.map((key) => switchTypeToActions(key))
	.reduce<string[]>((acc, cur) => acc.concat(...cur), []);

function getCurrentValueValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Multilevel Switch"],
		endpoint,
		property: "currentValue",
	};
}

/** Returns the ValueID used to remember whether a node supports supervision on the start/stop level change commands*/
function getSuperviseStartStopLevelChangeValueId(): ValueID {
	return {
		commandClass: CommandClasses["Multilevel Switch"],
		property: "superviseStartStopLevelChange",
	};
}

export function getCompatEventValueId(endpoint?: number): ValueID {
	return {
		commandClass: CommandClasses["Multilevel Switch"],
		endpoint,
		property: "event",
	};
}

@API(CommandClasses["Multilevel Switch"])
export class MultilevelSwitchCCAPI extends CCAPI {
	public supportsCommand(cmd: MultilevelSwitchCommand): Maybe<boolean> {
		switch (cmd) {
			case MultilevelSwitchCommand.Get:
				return this.isSinglecast();
			case MultilevelSwitchCommand.Set:
			case MultilevelSwitchCommand.StartLevelChange:
			case MultilevelSwitchCommand.StopLevelChange:
				return true; // This is mandatory
			case MultilevelSwitchCommand.SupportedGet:
				return this.version >= 3 && this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.Get,
		);

		const cc = new MultilevelSwitchCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<MultilevelSwitchCCReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, ["currentValue", "targetValue", "duration"]);
		}
	}

	/**
	 * Sets the switch to a new value
	 * @param targetValue The new target value for the switch
	 * @param duration The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.
	 * @returns A promise indicating whether the command was completed
	 */
	@validateArgs()
	public async set(
		targetValue: number,
		duration?: Duration | string,
	): Promise<boolean> {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.Set,
		);

		const cc = new MultilevelSwitchCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValue,
			duration,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
		return true;

		// // Multilevel Switch commands may take some time to be executed.
		// // Therefore we try to supervise the command execution
		// const supervisionResult = await this.applHost.trySendCommandSupervised(
		// 	cc,
		// 	{
		// 		requestStatusUpdates: true,
		// 		onUpdate: (status) => {
		// 			if (
		// 				status === SupervisionStatus.Working ||
		// 				status === SupervisionStatus.Success
		// 			) {
		// 				void this.get().catch(() => {
		// 					/* ignore */
		// 				});
		// 			}
		// 		},
		// 	},
		// );

		// return (
		// 	!supervisionResult ||
		// 	supervisionResult.status === SupervisionStatus.Success
		// );
	}

	@validateArgs()
	public async startLevelChange(
		options: MultilevelSwitchCCStartLevelChangeOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.StartLevelChange,
		);

		const cc = new MultilevelSwitchCCStartLevelChange(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		// let mayUseSupervision: boolean;
		// if (this.endpoint.virtual) {
		// 	// We cannot use supervision when communicating with multiple nodes
		// 	mayUseSupervision = false;
		// } else {
		// 	// For singlecast, try to use supervision unless we know it is not supported
		// 	const superviseValueId = getSuperviseStartStopLevelChangeValueId();
		// 	const valueDB = this.getValueDB();
		// 	mayUseSupervision = valueDB.getValue(superviseValueId) !== false;

		// 	if (mayUseSupervision) {
		// 		// Try to supervise the command execution
		// 		const supervisionResult =
		// 			await this.applHost.trySendCommandSupervised(cc);

		// 		if (supervisionResult?.status === SupervisionStatus.Fail) {
		// 			throw new ZWaveError(
		// 				"startLevelChange failed",
		// 				ZWaveErrorCodes.SupervisionCC_CommandFailed,
		// 			);
		// 		} else if (
		// 			supervisionResult?.status === SupervisionStatus.NoSupport
		// 		) {
		// 			// Remember that we shouldn't use supervision for that
		// 			valueDB.setValue(superviseValueId, false);
		// 			mayUseSupervision = false;
		// 		}
		// 	}
		// }
		// if (!mayUseSupervision) {
		await this.applHost.sendCommand(cc);
		// }
	}

	public async stopLevelChange(): Promise<void> {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.StopLevelChange,
		);

		const cc = new MultilevelSwitchCCStopLevelChange(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});

		// let mayUseSupervision: boolean;
		// if (this.endpoint.virtual) {
		// 	// We cannot use supervision when communicating with multiple nodes
		// 	mayUseSupervision = false;
		// } else {
		// 	// For singlecast, try to use supervision unless we know it is not supported
		// 	const valueDB = this.getValueDB();
		// 	const superviseValueId = getSuperviseStartStopLevelChangeValueId();
		// 	mayUseSupervision =
		// 		valueDB.getValue<boolean>(superviseValueId) !== false;

		// 	if (mayUseSupervision) {
		// 		// Try to supervise the command execution
		// 		const supervisionResult =
		// 			await this.applHost.trySendCommandSupervised(cc);

		// 		if (supervisionResult?.status === SupervisionStatus.Fail) {
		// 			throw new ZWaveError(
		// 				"stopLevelChange failed",
		// 				ZWaveErrorCodes.SupervisionCC_CommandFailed,
		// 			);
		// 		} else if (
		// 			supervisionResult?.status === SupervisionStatus.NoSupport
		// 		) {
		// 			// Remember that we shouldn't use supervision for that
		// 			valueDB.setValue(superviseValueId, false);
		// 			mayUseSupervision = false;
		// 		}
		// 	}
		// }

		// if (!mayUseSupervision) {
		await this.applHost.sendCommand(cc);
		// }
	}

	public async getSupported(): Promise<SwitchType | undefined> {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.SupportedGet,
		);

		const cc = new MultilevelSwitchCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<MultilevelSwitchCCSupportedReport>(
				cc,
				this.commandOptions,
			);
		return response?.switchType;
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
		options,
	): Promise<void> => {
		if (property === "targetValue") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			const duration = Duration.from(options?.transitionDuration);
			const completed = await this.set(value, duration);

			// If the command did not fail, assume that it succeeded and update the currentValue accordingly
			// so UIs have immediate feedback
			if (completed) {
				if (this.isSinglecast()) {
					// Only update currentValue for valid target values
					if (
						!this.applHost.options.disableOptimisticValueUpdate &&
						value >= 0 &&
						value <= 99
					) {
						this.tryGetValueDB()?.setValue(
							getCurrentValueValueId(this.endpoint.index),
							value,
						);
					}

					// Verify the current value after a delay, unless the device supports Supervision and we know the actual value
					if (
						value === 255 ||
						!this.endpoint
							.getNodeUnsafe()
							?.supportsCC(CommandClasses.Supervision)
					) {
						// We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
						if (property === "targetValue")
							property = "currentValue";

						this.schedulePoll(
							{ property },
							value === 255 ? undefined : value,
							{ duration },
						);
					}
				} else if (this.isMulticast()) {
					// Only update currentValue for valid target values
					if (
						!this.applHost.options.disableOptimisticValueUpdate &&
						value >= 0 &&
						value <= 99
					) {
						// Figure out which nodes were affected by this command
						const affectedNodes =
							this.endpoint.node.physicalNodes.filter((node) =>
								node
									.getEndpoint(this.endpoint.index)
									?.supportsCC(this.ccId),
							);
						// and optimistically update the currentValue
						for (const node of affectedNodes) {
							this.applHost
								.tryGetValueDB(node.id)
								?.setValue(
									getCurrentValueValueId(this.endpoint.index),
									value,
								);
						}
					} else if (value === 255) {
						// We generally don't want to poll for multicasts because of how much traffic it can cause
						// However, when setting the value 255 (ON), we don't know the actual state

						// We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
						if (property === "targetValue")
							property = "currentValue";
						this.schedulePoll({ property }, undefined, {
							duration,
						});
					}
				}
			}
		} else if (switchTypeProperties.includes(property as string)) {
			// Since the switch only supports one of the switch types, we would
			// need to check if the correct one is used. But since the names are
			// purely cosmetic, we just accept all of them
			if (typeof value !== "boolean") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			if (value) {
				// The property names are organized so that positive motions are
				// at odd indices and negative motions at even indices
				const direction =
					switchTypeProperties.indexOf(property as string) % 2 === 0
						? "down"
						: "up";
				// Singlecast only: Try to retrieve the current value to use as the start level,
				// even if the target node is going to ignore it. There might
				// be some bugged devices that ignore the ignore start level flag.
				const startLevel = this.tryGetValueDB()?.getValue<number>(
					getCurrentValueValueId(this.endpoint.index),
				);
				// And perform the level change
				const duration = Duration.from(options?.transitionDuration);
				await this.startLevelChange({
					direction,
					ignoreStartLevel: true,
					startLevel,
					duration,
				});
			} else {
				await this.stopLevelChange();
			}
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "currentValue":
			case "targetValue":
			case "duration":
				return (await this.get())?.[property];
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};
}

@commandClass(CommandClasses["Multilevel Switch"])
@implementedVersion(4)
export class MultilevelSwitchCC extends CommandClass {
	declare ccCommand: MultilevelSwitchCommand;

	public constructor(host: ZWaveHost, options: CommandClassOptions) {
		super(host, options);
		this.registerValue(getSuperviseStartStopLevelChangeValueId().property, {
			internal: true,
		});
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Multilevel Switch"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		if (this.version >= 3) {
			// Find out which kind of switch this is
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "requesting switch type...",
				direction: "outbound",
			});
			const switchType = await api.getSupported();
			if (switchType != undefined) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `has switch type ${getEnumMemberName(
						SwitchType,
						switchType,
					)}`,
					direction: "inbound",
				});
			}
		} else {
			// requesting the switch type automatically creates the up/down actions
			// We need to do this manually for V1 and V2
			this.createMetadataForLevelChangeActions(applHost);
		}

		await this.refreshValues(applHost);

		// create compat event value if necessary
		if (
			applHost.getDeviceConfig?.(node.id)?.compat
				?.treatMultilevelSwitchSetAsEvent
		) {
			const valueId = getCompatEventValueId(this.endpointIndex);
			const valueDB = this.getValueDB(applHost);
			if (!valueDB.hasMetadata(valueId)) {
				valueDB.setMetadata(valueId, {
					...ValueMetadata.ReadOnlyUInt8,
					label: "Event value",
				});
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Multilevel Switch"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting current switch state...",
			direction: "outbound",
		});
		await api.get();
	}

	public setMappedBasicValue(
		applHost: ZWaveApplicationHost,
		value: number,
	): boolean {
		this.getValueDB(applHost).setValue(
			{
				commandClass: this.ccId,
				endpoint: this.endpointIndex,
				property: "currentValue",
			},
			value,
		);
		return true;
	}

	protected createMetadataForLevelChangeActions(
		applHost: ZWaveApplicationHost,
		// SDS13781: The Primary Switch Type SHOULD be 0x02 (Up/Down)
		switchType: SwitchType = SwitchType["Down/Up"],
	): void {
		const valueDB = this.getValueDB(applHost);

		// Create metadata for the control values if necessary
		const switchTypeName = getEnumMemberName(SwitchType, switchType);
		const [down, up] = switchTypeToActions(switchTypeName);
		const upValueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: up,
		};
		const downValueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: down,
		};

		if (!valueDB.hasMetadata(upValueId)) {
			valueDB.setMetadata(upValueId, {
				...ValueMetadata.Boolean,
				label: `Perform a level change (${up})`,
				valueChangeOptions: ["transitionDuration"],
				ccSpecific: { switchType },
			});
		}
		if (!valueDB.hasMetadata(downValueId)) {
			valueDB.setMetadata(downValueId, {
				...ValueMetadata.Boolean,
				label: `Perform a level change (${down})`,
				valueChangeOptions: ["transitionDuration"],
				ccSpecific: { switchType },
			});
		}
	}
}

interface MultilevelSwitchCCSetOptions extends CCCommandOptions {
	targetValue: number;
	// Version >= 2:
	duration?: Duration | string;
}

@CCCommand(MultilevelSwitchCommand.Set)
export class MultilevelSwitchCCSet extends MultilevelSwitchCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSwitchCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.targetValue = this.payload[0];

			if (this.payload.length >= 2) {
				this.duration = Duration.parseReport(this.payload[1]);
			}
		} else {
			this.targetValue = options.targetValue;
			this.duration = Duration.from(options.duration);
		}
	}

	public targetValue: number;
	public duration: Duration | undefined;

	public serialize(): Buffer {
		const payload = [this.targetValue];
		if (this.version >= 2 && this.duration) {
			payload.push(this.duration.serializeSet());
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"target value": this.targetValue,
		};
		if (this.duration) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(MultilevelSwitchCommand.Report)
export class MultilevelSwitchCCReport extends MultilevelSwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._currentValue = parseMaybeNumber(this.payload[0]);
		if (this.version >= 4 && this.payload.length >= 3) {
			this.targetValue = parseNumber(this.payload[1]);
			this.duration = Duration.parseReport(this.payload[2]);
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (
			this.currentValue === unknownNumber &&
			!applHost.options.preserveUnknownValues
		) {
			this._currentValue = undefined;
		}

		return super.persistValues(applHost);
	}

	@ccValue({ forceCreation: true })
	@ccValueMetadata({
		...ValueMetadata.Level,
		label: "Target value",
		valueChangeOptions: ["transitionDuration"],
	})
	public readonly targetValue: number | undefined;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyDuration,
		label: "Remaining duration",
	})
	public readonly duration: Duration | undefined;

	private _currentValue: Maybe<number> | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyLevel,
		label: "Current value",
	})
	public get currentValue(): Maybe<number> | undefined {
		return this._currentValue;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"current value": this.currentValue,
		};
		if (this.targetValue != undefined && this.duration) {
			message["target value"] = this.targetValue;
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(MultilevelSwitchCommand.Get)
@expectedCCResponse(MultilevelSwitchCCReport)
export class MultilevelSwitchCCGet extends MultilevelSwitchCC {}

type MultilevelSwitchCCStartLevelChangeOptions = {
	direction: keyof typeof LevelChangeDirection;
} & (
	| {
			ignoreStartLevel: true;
			startLevel?: number;
	  }
	| {
			ignoreStartLevel: false;
			startLevel: number;
	  }
) & {
		// Version >= 2:
		duration?: Duration | string;
	};

@CCCommand(MultilevelSwitchCommand.StartLevelChange)
export class MultilevelSwitchCCStartLevelChange extends MultilevelSwitchCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & MultilevelSwitchCCStartLevelChangeOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			const ignoreStartLevel = (this.payload[0] & 0b0_0_1_00000) >>> 5;
			this.ignoreStartLevel = !!ignoreStartLevel;
			const direction = (this.payload[0] & 0b0_1_0_00000) >>> 6;
			this.direction = direction ? "down" : "up";

			this.startLevel = this.payload[1];

			if (this.payload.length >= 3) {
				this.duration = Duration.parseSet(this.payload[2]);
			}
		} else {
			this.duration = Duration.from(options.duration);
			this.ignoreStartLevel = options.ignoreStartLevel;
			this.startLevel = options.startLevel ?? 0;
			this.direction = options.direction;
		}
	}

	public duration: Duration | undefined;
	public startLevel: number;
	public ignoreStartLevel: boolean;
	public direction: keyof typeof LevelChangeDirection;

	public serialize(): Buffer {
		const controlByte =
			(LevelChangeDirection[this.direction] << 6) |
			(this.ignoreStartLevel ? 0b0010_0000 : 0);
		const payload = [controlByte, this.startLevel];
		if (this.version >= 2 && this.duration) {
			payload.push(this.duration.serializeSet());
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			startLevel: `${this.startLevel}${
				this.ignoreStartLevel ? " (ignored)" : ""
			}`,
			direction: this.direction,
		};
		if (this.duration) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(MultilevelSwitchCommand.StopLevelChange)
export class MultilevelSwitchCCStopLevelChange extends MultilevelSwitchCC {}

@CCCommand(MultilevelSwitchCommand.SupportedReport)
export class MultilevelSwitchCCSupportedReport extends MultilevelSwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this._switchType = this.payload[0] & 0b11111;
	}

	// This is the primary switch type. We're not supporting secondary switch types
	private _switchType: SwitchType;
	@ccValue({ internal: true })
	public get switchType(): SwitchType {
		return this._switchType;
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		this.createMetadataForLevelChangeActions(applHost, this._switchType);
		return true;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"switch type": getEnumMemberName(SwitchType, this.switchType),
			},
		};
	}
}

@CCCommand(MultilevelSwitchCommand.SupportedGet)
@expectedCCResponse(MultilevelSwitchCCSupportedReport)
export class MultilevelSwitchCCSupportedGet extends MultilevelSwitchCC {}
