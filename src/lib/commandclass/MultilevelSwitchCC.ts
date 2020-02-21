import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { ValueID } from "../node/ValueDB";
import { getEnumMemberName, validatePayload } from "../util/misc";
import { Duration } from "../values/Duration";
import { ValueMetadata } from "../values/Metadata";
import { Maybe, parseMaybeNumber, parseNumber } from "../values/Primitive";
import { CCAPI, SetValueImplementation, SET_VALUE, throwUnsupportedProperty, throwWrongValueType } from "./API";
import { API, CCCommand, CCCommandOptions, ccValue, ccValueMetadata, CommandClass, commandClass, CommandClassDeserializationOptions, expectedCCResponse, gotDeserializationOptions, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
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

export enum LevelChangeDirection {
	"up" = 0b0,
	"down" = 0b1,
	// "none" = 0b11,
}

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
 * Translates a switch type into two actions that may be performed. Unknown types default to Off/On
 */
function switchTypeToActions(switchType: string): [string, string] {
	if (!switchType.includes("/")) switchType = SwitchType[0x01]; // Off/On
	return switchType.split("/", 2) as any;
}
const switchTypeProperties = Object.keys(SwitchType)
	.filter(key => key.indexOf("/") > -1)
	.map(key => switchTypeToActions(key))
	.reduce<string[]>((acc, cur) => acc.concat(...cur), []);

function getCurrentValueValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Multilevel Switch"],
		endpoint,
		property: "currentValue",
	};
}

@API(CommandClasses["Multilevel Switch"])
export class MultilevelSwitchCCAPI extends CCAPI {
	public supportsCommand(cmd: MultilevelSwitchCommand): Maybe<boolean> {
		switch (cmd) {
			case MultilevelSwitchCommand.Get:
			case MultilevelSwitchCommand.Set:
			case MultilevelSwitchCommand.StartLevelChange:
			case MultilevelSwitchCommand.StopLevelChange:
				return true; // This is mandatory
			case MultilevelSwitchCommand.SupportedGet:
				return this.version >= 3;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		this.assertSupportsCommand(
			MultilevelSwitchCommand,
			MultilevelSwitchCommand.Get,
		);

		const cc = new MultilevelSwitchCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			MultilevelSwitchCCReport
		>(cc))!;
		return {
			currentValue: response.currentValue,
			targetValue: response.targetValue,
			duration: response.duration,
		};
	}

	/**
	 * Sets the switch to a new value
	 * @param targetValue The new target value for the switch
	 * @param duration The optional duration to reach the target value. Available in V2+
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

		// Multilevel Switch commands may take some time to be executed.
		// Therefore we try to supervise the command execution
		const supervisionResult = await this.driver.trySendCommandSupervised(
			cc,
			{
				requestStatusUpdates: true,
				onUpdate: status => {
					if (
						status === SupervisionStatus.Working ||
						status === SupervisionStatus.Success
					) {
						this.get();
					}
				},
			},
		);

		// Refresh the current value
		if (
			!supervisionResult ||
			supervisionResult.status === SupervisionStatus.Working ||
			supervisionResult.status === SupervisionStatus.Success
		) {
			await this.get();
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

		// Try to supervise the command execution
		const supervisionResult = await this.driver.trySendCommandSupervised(
			cc,
		);

		if (
			supervisionResult &&
			(supervisionResult.status === SupervisionStatus.Fail ||
				supervisionResult.status === SupervisionStatus.NoSupport)
		) {
			throw new ZWaveError(
				"startLevelChange failed",
				ZWaveErrorCodes.SupervisionCC_CommandFailed,
			);
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

		// Try to supervise the command execution
		const supervisionResult = await this.driver.trySendCommandSupervised(
			cc,
		);

		if (
			supervisionResult &&
			(supervisionResult.status === SupervisionStatus.Fail ||
				supervisionResult.status === SupervisionStatus.NoSupport)
		) {
			throw new ZWaveError(
				"stopLevelChange failed",
				ZWaveErrorCodes.SupervisionCC_CommandFailed,
			);
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
		const response = (await this.driver.sendCommand<
			MultilevelSwitchCCSupportedReport
		>(cc))!;
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

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Multilevel Switch"];

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
				} interview...`,
			direction: "none",
		});

		if (complete && this.version >= 3) {
			// Find out which kind of switch this is
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "requesting switch type...",
				direction: "outbound",
			});
			const switchType = await api.getSupported();
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `has switch type ${getEnumMemberName(
					SwitchType,
					switchType,
				)}`,
				direction: "inbound",
			});
		}

		log.controller.logNode(node.id, {
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
	@ccValue()
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
		...ValueMetadata.ReadOnly,
		label: "Remaining duration until target value",
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
}

@CCCommand(MultilevelSwitchCommand.Get)
@expectedCCResponse(MultilevelSwitchCCReport)
export class MultilevelSwitchCCGet extends MultilevelSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

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
}

@CCCommand(MultilevelSwitchCommand.StopLevelChange)
export class MultilevelSwitchCCStopLevelChange extends MultilevelSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

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

		// Create metadata for the control values
		const switchTypeName = getEnumMemberName(SwitchType, this._switchType);
		const [up, down] = switchTypeToActions(switchTypeName);
		this.getValueDB().setMetadata(
			{
				commandClass: this.ccId,
				endpoint: this.endpointIndex,
				property: up,
			},
			{
				...ValueMetadata.Boolean,
				label: `Perform a level change (${up})`,
			},
		);
		this.getValueDB().setMetadata(
			{
				commandClass: this.ccId,
				endpoint: this.endpointIndex,
				property: down,
			},
			{
				...ValueMetadata.Boolean,
				label: `Perform a level change (${down})`,
			},
		);
	}

	// This is the primary switch type. We're not supporting secondary switch types
	private _switchType: SwitchType;
	@ccValue({ internal: true })
	public get switchType(): SwitchType {
		return this._switchType;
	}
}

@CCCommand(MultilevelSwitchCommand.SupportedGet)
@expectedCCResponse(MultilevelSwitchCCSupportedReport)
export class MultilevelSwitchCCSupportedGet extends MultilevelSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
