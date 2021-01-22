import type { MessageRecord, ValueID } from "@zwave-js/core";
import {
	CommandClasses,
	Duration,
	Maybe,
	MessageOrCCLogEntry,
	parseMaybeNumber,
	parseNumber,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	CCAPI,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	CommandClassOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { SupervisionStatus } from "./SupervisionCC";

export enum MultilevelSwitchCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	StartLevelChange = 0x04,
	StopLevelChange = 0x05,
	SupportedGet = 0x06,
	SupportedReport = 0x07,
}

/**
 * @publicAPI
 */
export enum LevelChangeDirection {
	"up" = 0b0,
	"down" = 0b1,
	// "none" = 0b11,
}

/**
 * @publicAPI
 */
export enum SwitchType {
	"not supported" = 0x00,
	"Off/On" = 0x01,
	"Down/Up" = 0x02,
	"Close/Open" = 0x03,
	"CCW/CW" = 0x04,
	"Left/Right" = 0x05,
	"Reverse/Forward" = 0x06,
	"Pull/Push" = 0x07,
}
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

/**
 * @publicAPI
 */
export type MultilevelSwitchLevelChangeMetadata = ValueMetadata & {
	ccSpecific: {
		switchType: SwitchType;
	};
};

function getCurrentValueValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Multilevel Switch"],
		endpoint,
		property: "currentValue",
	};
}

function getTargetValueValueId(endpoint?: number): ValueID {
	return {
		commandClass: CommandClasses["Multilevel Switch"],
		endpoint,
		property: "targetValue",
	};
}

/** Returns the ValueID used to remember whether a node supports supervision on the start/stop level change commands*/
function getSuperviseStartStopLevelChangeValueId(): ValueID {
	return {
		commandClass: CommandClasses["Multilevel Switch"],
		property: "superviseStartStopLevelChange",
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

		const cc = new MultilevelSwitchCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<MultilevelSwitchCCReport>(
			cc,
			this.commandOptions,
		))!;
		return {
			currentValue: response.currentValue,
			targetValue: response.targetValue,
			duration: response.duration,
		};
	}

	private refreshTimeout: NodeJS.Timeout | undefined;

	/**
	 * Sets the switch to a new value
	 * @param targetValue The new target value for the switch
	 * @param duration The optional duration to reach the target value. Available in V2+
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async set(targetValue: number, duration?: Duration) {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.Set,
		);

		const cc = new MultilevelSwitchCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValue,
			duration,
		});
		if (this.isSinglecast()) {
			// remember the value in case the device does not respond with a target value
			this.endpoint
				.getNodeUnsafe()
				?.valueDB.setValue(
					getTargetValueValueId(this.endpoint.index),
					targetValue,
					{ noEvent: true },
				);
		}

		// Multilevel Switch commands may take some time to be executed.
		// Therefore we try to supervise the command execution
		const supervisionResult = await this.driver.trySendCommandSupervised(
			cc,
			{
				requestStatusUpdates: true,
				onUpdate: (status) => {
					if (
						status === SupervisionStatus.Working ||
						status === SupervisionStatus.Success
					) {
						void this.get().catch(() => {
							/* ignore */
						});
					}
				},
			},
		);

		// Refresh the current value
		if (
			!supervisionResult ||
			supervisionResult.status === SupervisionStatus.Success
		) {
			if (this.isSinglecast()) {
				// Refresh the current value after a delay
				if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
				setTimeout(async () => {
					this.refreshTimeout = undefined;
					try {
						await this.get();
					} catch {
						/* ignore */
					}
				}, duration?.toMilliseconds() ?? this.driver.options.timeouts.refreshValue).unref();
			}
		}
	}

	public async startLevelChange(
		options: MultilevelSwitchCCStartLevelChangeOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.StartLevelChange,
		);

		const cc = new MultilevelSwitchCCStartLevelChange(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		const superviseValueId = getSuperviseStartStopLevelChangeValueId();
		const node = this.endpoint.getNodeUnsafe()!;
		// Assume supervision is supported until we know it is not
		let mayUseSupervision = node.getValue(superviseValueId) !== false;

		if (mayUseSupervision) {
			// Try to supervise the command execution
			const supervisionResult = await this.driver.trySendCommandSupervised(
				cc,
			);

			if (supervisionResult?.status === SupervisionStatus.Fail) {
				throw new ZWaveError(
					"startLevelChange failed",
					ZWaveErrorCodes.SupervisionCC_CommandFailed,
				);
			} else if (
				supervisionResult?.status === SupervisionStatus.NoSupport
			) {
				// Remember that we shouldn't use supervision for that
				node.valueDB.setValue(superviseValueId, false);
				mayUseSupervision = false;
			}
		}
		// In order to support a fallback to no supervision, we must not use else-if here
		if (!mayUseSupervision) {
			await this.driver.sendCommand(cc);
		}
	}

	public async stopLevelChange(): Promise<void> {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.StopLevelChange,
		);

		const cc = new MultilevelSwitchCCStopLevelChange(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});

		const superviseValueId = getSuperviseStartStopLevelChangeValueId();
		const node = this.endpoint.getNodeUnsafe()!;
		// Assume supervision is supported until we know it is not
		let mayUseSupervision = node.getValue(superviseValueId) !== false;

		if (mayUseSupervision) {
			// Try to supervise the command execution
			const supervisionResult = await this.driver.trySendCommandSupervised(
				cc,
			);

			if (supervisionResult?.status === SupervisionStatus.Fail) {
				throw new ZWaveError(
					"stopLevelChange failed",
					ZWaveErrorCodes.SupervisionCC_CommandFailed,
				);
			} else if (
				supervisionResult?.status === SupervisionStatus.NoSupport
			) {
				// Remember that we shouldn't use supervision for that
				node.valueDB.setValue(superviseValueId, false);
				mayUseSupervision = false;
			}
		}
		// In order to support a fallback to no supervision, we must not use else-if here
		if (!mayUseSupervision) {
			await this.driver.sendCommand(cc);
		}
	}

	public async getSupported(): Promise<SwitchType> {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.SupportedGet,
		);

		const cc = new MultilevelSwitchCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<MultilevelSwitchCCSupportedReport>(
			cc,
			this.commandOptions,
		))!;
		return response.switchType;
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
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
			await this.set(value);
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
				// Try to retrieve the current value to use as the start level,
				// even if the target node is going to ignore it. There might
				// be some bugged devices that ignore the ignore start level flag.
				const startLevel = this.endpoint
					.getNodeUnsafe()
					?.getValue<number>(
						getCurrentValueValueID(this.endpoint.index),
					);
				// And perform the level change
				await this.startLevelChange({
					direction,
					ignoreStartLevel: true,
					startLevel,
				});
			} else {
				await this.stopLevelChange();
			}
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};
}

@commandClass(CommandClasses["Multilevel Switch"])
@implementedVersion(4)
export class MultilevelSwitchCC extends CommandClass {
	declare ccCommand: MultilevelSwitchCommand;

	public constructor(driver: Driver, options: CommandClassOptions) {
		super(driver, options);
		this.registerValue(
			getSuperviseStartStopLevelChangeValueId().property,
			true,
		);
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Multilevel Switch"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		if (complete) {
			if (this.version >= 3) {
				// Find out which kind of switch this is
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "requesting switch type...",
					direction: "outbound",
				});
				const switchType = await api.getSupported();
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `has switch type ${getEnumMemberName(
						SwitchType,
						switchType,
					)}`,
					direction: "inbound",
				});
			} else {
				// requesting the switch type automatically creates the up/down actions
				// We need to do this manually for V1 and V2
				this.createMetadataForLevelChangeActions();
			}
		}

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting current switch state...",
			direction: "outbound",
		});
		await api.get();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public setMappedBasicValue(value: number): boolean {
		this.getValueDB().setValue(
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
		// SDS13781: The Primary Switch Type SHOULD be 0x02 (Up/Down)
		switchType: SwitchType = SwitchType["Down/Up"],
	): void {
		const valueDb = this.getValueDB();

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

		if (!valueDb.hasMetadata(upValueId)) {
			this.getValueDB().setMetadata(upValueId, {
				...ValueMetadata.Boolean,
				label: `Perform a level change (${up})`,
				ccSpecific: { switchType },
			});
		}
		if (!valueDb.hasMetadata(downValueId)) {
			this.getValueDB().setMetadata(downValueId, {
				...ValueMetadata.Boolean,
				label: `Perform a level change (${down})`,
				ccSpecific: { switchType },
			});
		}
	}
}

interface MultilevelSwitchCCSetOptions extends CCCommandOptions {
	targetValue: number;
	// Version >= 2:
	duration?: Duration;
}

@CCCommand(MultilevelSwitchCommand.Set)
export class MultilevelSwitchCCSet extends MultilevelSwitchCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSwitchCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.targetValue = options.targetValue;
			this.duration = options.duration;
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"target value": this.targetValue,
		};
		if (this.duration) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(MultilevelSwitchCommand.Report)
export class MultilevelSwitchCCReport extends MultilevelSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		// if the payload contains a reserved value, return the actual value
		// instead of undefined
		this._currentValue =
			parseMaybeNumber(this.payload[0]) || this.payload[0];
		if (this.version >= 4 && this.payload.length >= 3) {
			this._targetValue = parseNumber(this.payload[1]);
			this._duration = Duration.parseReport(this.payload[2]);
		}
		this.persistValues();
	}

	private _targetValue: number | undefined;
	@ccValue({ forceCreation: true })
	@ccValueMetadata({
		...ValueMetadata.Level,
		label: "Target value",
	})
	public get targetValue(): number | undefined {
		return this._targetValue;
	}

	private _duration: Duration | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Duration,
		label: "Transition duration",
	})
	public get duration(): Duration | undefined {
		return this._duration;
	}

	private _currentValue: Maybe<number>;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyLevel,
		label: "Current value",
	})
	public get currentValue(): Maybe<number> {
		return this._currentValue;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"current value": this._currentValue,
		};
		if (this._targetValue != undefined && this._duration) {
			message["target value"] = this._targetValue;
			message.duration = this._duration.toString();
		}
		return {
			...super.toLogEntry(),
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
		duration?: Duration;
	};

@CCCommand(MultilevelSwitchCommand.StartLevelChange)
export class MultilevelSwitchCCStartLevelChange extends MultilevelSwitchCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & MultilevelSwitchCCStartLevelChangeOptions),
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.duration = options.duration;
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

	public toLogEntry(): MessageOrCCLogEntry {
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
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(MultilevelSwitchCommand.StopLevelChange)
export class MultilevelSwitchCCStopLevelChange extends MultilevelSwitchCC {}

@CCCommand(MultilevelSwitchCommand.SupportedReport)
export class MultilevelSwitchCCSupportedReport extends MultilevelSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._switchType = this.payload[0] & 0b11111;
		this.persistValues();
	}

	// This is the primary switch type. We're not supporting secondary switch types
	private _switchType: SwitchType;
	@ccValue({ internal: true })
	public get switchType(): SwitchType {
		return this._switchType;
	}

	public persistValues(): boolean {
		if (!super.persistValues()) return false;
		this.createMetadataForLevelChangeActions(this._switchType);
		return true;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"switch type": getEnumMemberName(SwitchType, this.switchType),
			},
		};
	}
}

@CCCommand(MultilevelSwitchCommand.SupportedGet)
@expectedCCResponse(MultilevelSwitchCCSupportedReport)
export class MultilevelSwitchCCSupportedGet extends MultilevelSwitchCC {}
