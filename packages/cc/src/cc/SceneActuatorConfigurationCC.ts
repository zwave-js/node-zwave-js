import {
	CommandClasses,
	Duration,
	getCCName,
	Maybe,
	MessageOrCCLogEntry,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
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
} from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { SceneActuatorConfigurationCommand } from "../lib/_Types";

export const SceneActuatorConfigurationCCValues = Object.freeze({
	...V.defineDynamicCCValues(CommandClasses["Scene Actuator Configuration"], {
		...V.dynamicPropertyAndKeyWithName(
			"level",
			"level",
			(sceneId: number) => sceneId,
			({ property, propertyKey }) =>
				property === "level" && typeof propertyKey === "number",
			(sceneId: number) =>
				({
					...ValueMetadata.UInt8,
					label: `Level (${sceneId})`,
					valueChangeOptions: ["transitionDuration"],
				} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"dimmingDuration",
			"dimmingDuration",
			(sceneId: number) => sceneId,
			({ property, propertyKey }) =>
				property === "dimmingDuration" &&
				typeof propertyKey === "number",
			(sceneId: number) =>
				({
					...ValueMetadata.Duration,
					label: `Dimming duration (${sceneId})`,
				} as const),
		),
	}),
});

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
	) => {
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
				this.tryGetValueDB()?.getValue<Duration>(
					SceneActuatorConfigurationCCValues.dimmingDuration(
						propertyKey,
					).endpoint(this.endpoint.index),
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
			const level = this.tryGetValueDB()?.getValue<number>(
				SceneActuatorConfigurationCCValues.level(propertyKey).endpoint(
					this.endpoint.index,
				),
			);

			await this.set(propertyKey, dimmingDuration, level);
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}

		return undefined;
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
		const cc = new SceneActuatorConfigurationCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId,
			dimmingDuration:
				Duration.from(dimmingDuration) ?? new Duration(0, "seconds"),
			level,
		});

		await this.applHost.sendCommand(cc, this.commandOptions);
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

		const cc = new SceneActuatorConfigurationCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId: 0,
		});
		const response =
			await this.applHost.sendCommand<SceneActuatorConfigurationCCReport>(
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

		const cc = new SceneActuatorConfigurationCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId: sceneId,
		});
		const response =
			await this.applHost.sendCommand<SceneActuatorConfigurationCCReport>(
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
@ccValues(SceneActuatorConfigurationCCValues)
export class SceneActuatorConfigurationCC extends CommandClass {
	declare ccCommand: SceneActuatorConfigurationCommand;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			message: `${this.constructor.name}: setting metadata`,
			direction: "none",
		});

		// Create Metadata for all scenes
		for (let sceneId = 1; sceneId <= 255; sceneId++) {
			const levelValue =
				SceneActuatorConfigurationCCValues.level(sceneId);
			this.ensureMetadata(applHost, levelValue);

			const dimmingDurationValue =
				SceneActuatorConfigurationCCValues.dimmingDuration(sceneId);
			this.ensureMetadata(applHost, dimmingDurationValue);
		}

		this.setInterviewComplete(applHost, true);
	}

	// `refreshValues()` would create 255 `Get` commands to be issued to the node
	// Therefore, I think we should not implement it. Here is how it would be implemented
	//
	// public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
	// 	const node = this.getNode(applHost)!;
	// 	const endpoint = this.getEndpoint(applHost)!;
	// 	const api = endpoint.commandClasses[
	// 		"Scene Actuator Configuration"
	// 	].withOptions({
	// 		priority: MessagePriority.NodeQuery,
	// 	});
	// 	this.applHost.controllerLog.logNode(node.id, {
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
	}

	public readonly sceneId: number;
	public readonly level?: number;
	public readonly dimmingDuration?: Duration;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Do not persist values for an inactive scene
		if (
			this.sceneId === 0 ||
			this.level == undefined ||
			this.dimmingDuration == undefined
		) {
			return false;
		}

		const levelValue = SceneActuatorConfigurationCCValues.level(
			this.sceneId,
		);
		this.ensureMetadata(applHost, levelValue);

		const dimmingDurationValue =
			SceneActuatorConfigurationCCValues.dimmingDuration(this.sceneId);
		this.ensureMetadata(applHost, dimmingDurationValue);

		this.setValue(applHost, levelValue, this.level);
		this.setValue(applHost, dimmingDurationValue, this.dimmingDuration);

		return true;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "scene id": this.sceneId },
		};
	}
}
