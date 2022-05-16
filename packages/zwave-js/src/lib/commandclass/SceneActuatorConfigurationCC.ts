import {
	CommandClasses,
	Duration,
	getCCName,
	Maybe,
	MessageOrCCLogEntry,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
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
import { SceneActuatorConfigurationCommand } from "./_Types";

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

function setSceneActuatorConfigMetaData(
	this: SceneActuatorConfigurationCC,
	sceneId: number,
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
			valueChangeOptions: ["transitionDuration"],
		});
	}
	if (!valueDB.hasMetadata(dimmingDurationValueId)) {
		valueDB.setMetadata(dimmingDurationValueId, {
			...ValueMetadata.Duration,
			label: `Dimming duration (${sceneId})`,
		});
	}
}

function persistSceneActuatorConfig(
	this: SceneActuatorConfigurationCC,
	sceneId: number,
	level: number,
	dimmingDuration: Duration,
): boolean {
	const levelValueId = getLevelValueID(this.endpointIndex, sceneId);
	const dimmingDurationValueId = getDimmingDurationValueID(
		this.endpointIndex,
		sceneId,
	);
	const valueDB = this.getValueDB();

	if (
		!valueDB.hasMetadata(levelValueId) ||
		!valueDB.hasMetadata(dimmingDurationValueId)
	) {
		setSceneActuatorConfigMetaData.call(this, sceneId);
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
				return true;
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
		options,
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

			// We need to set the dimming duration along with the level.
			// Dimming duration is chosen with the following precedence:
			// 1. options.transitionDuration
			// 2. current stored value
			// 3. default
			const dimmingDuration =
				Duration.from(options?.transitionDuration) ??
				this.endpoint
					.getNodeUnsafe()!
					.getValue<Duration>(
						getDimmingDurationValueID(
							this.endpoint.index,
							propertyKey,
						),
					);
			await this.set(propertyKey, dimmingDuration, value);
		} else if (property === "dimmingDuration") {
			if (typeof value !== "string" && !(value instanceof Duration)) {
				throwWrongValueType(
					this.ccId,
					property,
					"duration",
					typeof value,
				);
			}

			const dimmingDuration = Duration.from(value);
			if (dimmingDuration == undefined) {
				throw new ZWaveError(
					`${getCCName(
						this.ccId,
					)}: "${property}" could not be set. ${JSON.stringify(
						value,
					)} is not a valid duration.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			// Must set the level along with the dimmingDuration,
			// Use saved value, if it's defined. Otherwise the default
			// will be used.
			const node = this.endpoint.getNodeUnsafe()!;
			const level = node.getValue<number>(
				getLevelValueID(this.endpoint.index, propertyKey),
			);

			await this.set(propertyKey, dimmingDuration, level);
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
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

	@validateArgs()
	public async set(
		sceneId: number,
		dimmingDuration?: Duration | string,
		level?: number,
	): Promise<void> {
		this.assertSupportsCommand(
			SceneActuatorConfigurationCommand,
			SceneActuatorConfigurationCommand.Set,
		);

		// Undefined `dimmingDuration` defaults to 0 seconds to simplify the call
		// for actuators that don't support non-instant `dimmingDuration`
		// Undefined `level` uses the actuator's current value (override = 0).
		const cc = new SceneActuatorConfigurationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId,
			dimmingDuration:
				Duration.from(dimmingDuration) ?? new Duration(0, "seconds"),
			level,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getActive(): Promise<
		| Pick<
				SceneActuatorConfigurationCCReport,
				"sceneId" | "level" | "dimmingDuration"
		  >
		| undefined
	> {
		this.assertSupportsCommand(
			SceneActuatorConfigurationCommand,
			SceneActuatorConfigurationCommand.Get,
		);

		const cc = new SceneActuatorConfigurationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId: 0,
		});
		const response =
			await this.driver.sendCommand<SceneActuatorConfigurationCCReport>(
				cc,
				this.commandOptions,
			);

		if (response) {
			return pick(response, ["sceneId", "level", "dimmingDuration"]);
		}
	}

	@validateArgs()
	public async get(
		sceneId: number,
	): Promise<
		| Pick<SceneActuatorConfigurationCCReport, "level" | "dimmingDuration">
		| undefined
	> {
		this.assertSupportsCommand(
			SceneActuatorConfigurationCommand,
			SceneActuatorConfigurationCommand.Get,
		);

		if (sceneId === 0) {
			throw new ZWaveError(
				`Invalid scene ID 0. To get the currently active scene, use getActive() instead.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new SceneActuatorConfigurationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId: sceneId,
		});
		const response =
			await this.driver.sendCommand<SceneActuatorConfigurationCCReport>(
				cc,
				this.commandOptions,
			);

		if (response) {
			return pick(response, ["level", "dimmingDuration"]);
		}
	}
}

@commandClass(CommandClasses["Scene Actuator Configuration"])
@implementedVersion(1)
export class SceneActuatorConfigurationCC extends CommandClass {
	declare ccCommand: SceneActuatorConfigurationCommand;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;

		driver.controllerLog.logNode(node.id, {
			message: `${this.constructor.name}: setting metadata`,
			direction: "none",
		});

		for (let sceneId = 1; sceneId <= 255; sceneId++) {
			setSceneActuatorConfigMetaData.call(this, sceneId);
		}

		this.interviewComplete = true;
	}

	// `refreshValues()` would create 255 `Get` commands to be issued to the node
	// Therefore, I think we should not implement it. Here is how it would be implemented
	//
	// public async refreshValues(driver: Driver): Promise<void> {
	// 	const node = this.getNode(driver)!;
	// 	const endpoint = this.getEndpoint(driver)!;
	// 	const api = endpoint.commandClasses[
	// 		"Scene Actuator Configuration"
	// 	].withOptions({
	// 		priority: MessagePriority.NodeQuery,
	// 	});
	// 	this.driver.controllerLog.logNode(node.id, {
	// 		message: "querying all scene actuator configs...",
	// 		direction: "outbound",
	// 	});
	// 	for (let sceneId = 1; sceneId <= 255; sceneId++) {
	// 		await api.get(sceneId);
	// 	}
	// }
}

interface SceneActuatorConfigurationCCSetOptions extends CCCommandOptions {
	sceneId: number;
	dimmingDuration: Duration;
	level?: number;
}

@CCCommand(SceneActuatorConfigurationCommand.Set)
export class SceneActuatorConfigurationCCSet extends SceneActuatorConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| SceneActuatorConfigurationCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.sceneId < 1 || options.sceneId > 255) {
				throw new ZWaveError(
					`The scene id ${options.sceneId} must be between 1 and 255!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.sceneId = options.sceneId;
			this.dimmingDuration = options.dimmingDuration;
			this.level = options.level;
		}
	}

	public sceneId: number;
	public dimmingDuration: Duration;
	public level?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.sceneId,
			this.dimmingDuration.serializeSet(),
			this.level != undefined ? 0b1000_0000 : 0,
			this.level ?? 0xff,
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				sceneId: this.sceneId,
				level: this.level,
				dimmingDuration: this.dimmingDuration?.toString(),
			},
		};
	}
}

@CCCommand(SceneActuatorConfigurationCommand.Report)
export class SceneActuatorConfigurationCCReport extends SceneActuatorConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 3);
		this.sceneId = this.payload[0];

		if (this.sceneId !== 0) {
			this.level = this.payload[1];
			this.dimmingDuration =
				Duration.parseReport(this.payload[2]) ??
				new Duration(0, "unknown");
		}

		this.persistValues();
	}

	public readonly sceneId: number;
	public readonly level?: number;
	public readonly dimmingDuration?: Duration;

	public persistValues(): boolean {
		// Do not persist values for an inactive scene
		if (
			this.sceneId === 0 ||
			this.level == undefined ||
			this.dimmingDuration == undefined
		) {
			return false;
		}

		return persistSceneActuatorConfig.call(
			this,
			this.sceneId,
			this.level,
			this.dimmingDuration,
		);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				sceneId: this.sceneId,
				level: this.level,
				dimmingDuration: this.dimmingDuration?.toString(),
			},
		};
	}
}

function testResponseForSceneActuatorConfigurationGet(
	sent: SceneActuatorConfigurationCCGet,
	received: SceneActuatorConfigurationCCReport,
) {
	// We expect a Scene Actuator Configuration Report that matches
	// the requested sceneId, unless groupId 0 was requested
	return sent.sceneId === 0 || received.sceneId === sent.sceneId;
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| SceneActuatorConfigurationCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
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
