import {
	CommandClasses,
	Duration,
	Maybe,
	MessageOrCCLogEntry,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

// All the supported commands
export enum SceneActuatorConfigurationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export function getLevelValueID(
	endpoint: number | undefined,
	sceneId: number,
): ValueID {
	return {
		commandClass: CommandClasses["Scene Actuator Configuration"],
		endpoint,
		property: "level",
		propertyKey: sceneId,
	};
}

export function getDimmingDurationValueID(
	endpoint: number | undefined,
	sceneId: number,
): ValueID {
	return {
		commandClass: CommandClasses["Scene Actuator Configuration"],
		endpoint,
		property: "dimmingDuration",
		propertyKey: sceneId,
	};
}

function persistSceneActuatorConfig(
	this: SceneActuatorConfigurationCC,
	sceneId: number,
	level: number,
	dimmingDuration: Duration,
) {
	const levelValueId = getLevelValueID(this.endpointIndex, sceneId);
	const dimmingDurationValueId = getDimmingDurationValueID(
		this.endpointIndex,
		sceneId,
	);
	const valueDB = this.getValueDB();

	if (!valueDB.hasMetadata(levelValueId)) {
		valueDB.setMetadata(levelValueId, {
			...ValueMetadata.UInt8,
			label: `Level (${sceneId})`,
		});
	}
	if (!valueDB.hasMetadata(dimmingDurationValueId)) {
		valueDB.setMetadata(dimmingDurationValueId, {
			...ValueMetadata.Duration,
			label: `Dimming duration (${sceneId})`,
		});
	}

	valueDB.setValue(levelValueId, level);
	valueDB.setValue(dimmingDurationValueId, dimmingDuration);

	return true;
}

@API(CommandClasses["Scene Actuator Configuration"])
export class SceneActuatorConfigurationCCAPI extends CCAPI {
	public supportsCommand(
		cmd: SceneActuatorConfigurationCommand,
	): Maybe<boolean> {
		switch (cmd) {
			case SceneActuatorConfigurationCommand.Get:
				return this.isSinglecast();
			case SceneActuatorConfigurationCommand.Set:
			case SceneActuatorConfigurationCommand.Report:
				return true;
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	): Promise<void> => {
		if (propertyKey == undefined) {
			throwMissingPropertyKey(this.ccId, property);
		} else if (typeof propertyKey !== "number") {
			throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
		}
		if (property === "level") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}

			// We need to set the dimming duration along with the level
			const node = this.endpoint.getNodeUnsafe()!;
			// If duration is missing, we set a default of instant
			const dimmingDuration =
				node.getValue<Duration>(
					getDimmingDurationValueID(this.endpoint.index, propertyKey),
				) ?? new Duration(0, "seconds");
			await this.set(propertyKey, dimmingDuration);
		} else {
			// setting dimmingDuration value alone not supported,
			// to be added when setting Duration values is supported
			throwUnsupportedProperty(this.ccId, property);
		}

		// Verify the current value after a delay
		this.schedulePoll({ property, propertyKey });
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
		propertyKey,
	}): Promise<unknown> => {
		switch (property) {
			case "level":
			case "dimmingDuration": {
				if (propertyKey == undefined) {
					throwMissingPropertyKey(this.ccId, property);
				} else if (typeof propertyKey !== "number") {
					throwUnsupportedPropertyKey(
						this.ccId,
						property,
						propertyKey,
					);
				}
				return (await this.get(propertyKey))?.[property];
			}
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	public async set(
		sceneId: number,
		dimmingDuration: Duration,
		level?: number,
	): Promise<void> {
		this.assertSupportsCommand(
			SceneActuatorConfigurationCommand,
			SceneActuatorConfigurationCommand.Set,
		);

		const cc = new SceneActuatorConfigurationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId,
			dimmingDuration,
			level,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async get(
		sceneId: number,
	): Promise<
		| {
				sceneId: number;
				level: number;
				dimmingDuration: Duration;
		  }
		| undefined
	> {
		this.assertSupportsCommand(
			SceneActuatorConfigurationCommand,
			SceneActuatorConfigurationCommand.Get,
		);

		const cc = new SceneActuatorConfigurationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId: sceneId,
		});
		const response = await this.driver.sendCommand<SceneActuatorConfigurationCCReport>(
			cc,
			this.commandOptions,
		);

		if (response) {
			return pick(response, ["sceneId", "level", "dimmingDuration"]);
		}
	}
}

@commandClass(CommandClasses["Scene Actuator Configuration"])
@implementedVersion(1)
export class SceneActuatorConfigurationCC extends CommandClass {
	declare ccCommand: SceneActuatorConfigurationCommand;

	// interview is omitted, because our only option would be
	// to query all 255 possible sceneIds, which is a lot of traffic
	// for little benefit
}

interface SceneActuatorConfigurationCCSetOptions extends CCCommandOptions {
	sceneId: number;
	dimmingDuration: Duration;
	level?: number;
}

@CCCommand(SceneActuatorConfigurationCommand.Set)
export class SceneActuatorConfigurationCCSet extends SceneActuatorConfigurationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SceneActuatorConfigurationCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.sceneId < 1 || options.sceneId > 255) {
				throw new ZWaveError(
					`scene id ${options.sceneId} out of range [1..255]`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.sceneId = options.sceneId;
			this.dimmingDuration = options.dimmingDuration;
			if (options.level != undefined) {
				if (options.level < 0 || options.level > 255) {
					throw new ZWaveError(
						`level ${options.level} out of range [1..255]`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				this.override = true;
				this.level = options.level;
			} else {
				this.override = false;
				this.level = 0xff; // will be ignored
			}
		}
	}

	public sceneId: number;
	public dimmingDuration: Duration;
	public override: boolean;
	public level: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.sceneId,
			this.dimmingDuration.serializeSet(),
			this.override ? 0b1000_0000 : 0x00,
			this.level,
		]);
		return super.serialize();
	}
}

@CCCommand(SceneActuatorConfigurationCommand.Report)
export class SceneActuatorConfigurationCCReport extends SceneActuatorConfigurationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 3);
		this.sceneId = this.payload[0];
		this.level = this.payload[1];
		this.dimmingDuration =
			Duration.parseReport(this.payload[2]) ?? new Duration(0, "unknown");
	}

	public sceneId: number;
	public level: number;
	public dimmingDuration: Duration;

	public persistValues(): boolean {
		persistSceneActuatorConfig.call(
			this,
			this.sceneId,
			this.level,
			this.dimmingDuration,
		);
		return true;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				sceneId: this.sceneId,
				level: this.level,
				dimmingDuration: this.dimmingDuration.toString(),
			},
		};
	}
}

function testResponseForSceneActuatorConfigurationGet(
	sent: SceneActuatorConfigurationCCGet,
	received: SceneActuatorConfigurationCCReport,
) {
	return received.sceneId === sent.sceneId;
}

interface SceneActuatorConfigurationCCGetOptions extends CCCommandOptions {
	sceneId: number;
}

@CCCommand(SceneActuatorConfigurationCommand.Get)
@expectedCCResponse(
	SceneActuatorConfigurationCCReport,
	testResponseForSceneActuatorConfigurationGet,
)
export class SceneActuatorConfigurationCCGet extends SceneActuatorConfigurationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SceneActuatorConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.sceneId < 1 || options.sceneId > 255) {
				throw new ZWaveError(
					`scene id ${options.sceneId} out of range [1..255]`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.sceneId = options.sceneId;
		}
	}

	public sceneId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sceneId]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "scene id": this.sceneId },
		};
	}
}
