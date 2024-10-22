import {
	CommandClasses,
	Duration,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	getCCName,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
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
			(sceneId: number) => ({
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
				property === "dimmingDuration"
				&& typeof propertyKey === "number",
			(sceneId: number) => ({
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
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case SceneActuatorConfigurationCommand.Get:
				return this.isSinglecast();
			case SceneActuatorConfigurationCommand.Set:
				return true;
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: SceneActuatorConfigurationCCAPI,
			{ property, propertyKey },
			value,
			options,
		) {
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
					Duration.from(options?.transitionDuration)
						?? this.tryGetValueDB()?.getValue<Duration>(
							SceneActuatorConfigurationCCValues.dimmingDuration(
								propertyKey,
							).endpoint(this.endpoint.index),
						);
				return this.set(propertyKey, dimmingDuration, value);
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
						`${
							getCCName(
								this.ccId,
							)
						}: "${property}" could not be set. ${
							JSON.stringify(
								value,
							)
						} is not a valid duration.`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}

				// Must set the level along with the dimmingDuration,
				// Use saved value, if it's defined. Otherwise the default
				// will be used.
				const level = this.tryGetValueDB()?.getValue<number>(
					SceneActuatorConfigurationCCValues.level(
						propertyKey,
					).endpoint(this.endpoint.index),
				);

				return this.set(propertyKey, dimmingDuration, level);
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: SceneActuatorConfigurationCCAPI,
			{ property, propertyKey },
		) {
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
	}

	@validateArgs()
	public async set(
		sceneId: number,
		dimmingDuration?: Duration | string,
		level?: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			SceneActuatorConfigurationCommand,
			SceneActuatorConfigurationCommand.Set,
		);

		// Undefined `dimmingDuration` defaults to 0 seconds to simplify the call
		// for actuators that don't support non-instant `dimmingDuration`
		// Undefined `level` uses the actuator's current value (override = 0).
		const cc = new SceneActuatorConfigurationCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			sceneId,
			dimmingDuration: Duration.from(dimmingDuration)
				?? new Duration(0, "seconds"),
			level,
		});

		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getActive(): Promise<
		MaybeNotKnown<
			Pick<
				SceneActuatorConfigurationCCReport,
				"sceneId" | "level" | "dimmingDuration"
			>
		>
	> {
		this.assertSupportsCommand(
			SceneActuatorConfigurationCommand,
			SceneActuatorConfigurationCommand.Get,
		);

		const cc = new SceneActuatorConfigurationCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			sceneId: 0,
		});
		const response = await this.host.sendCommand<
			SceneActuatorConfigurationCCReport
		>(
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
		MaybeNotKnown<
			Pick<
				SceneActuatorConfigurationCCReport,
				"level" | "dimmingDuration"
			>
		>
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

		const cc = new SceneActuatorConfigurationCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			sceneId: sceneId,
		});
		const response = await this.host.sendCommand<
			SceneActuatorConfigurationCCReport
		>(
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
	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			message: `${this.constructor.name}: setting metadata`,
			direction: "none",
		});

		// Create Metadata for all scenes
		for (let sceneId = 1; sceneId <= 255; sceneId++) {
			const levelValue = SceneActuatorConfigurationCCValues.level(
				sceneId,
			);
			this.ensureMetadata(ctx, levelValue);

			const dimmingDurationValue = SceneActuatorConfigurationCCValues
				.dimmingDuration(sceneId);
			this.ensureMetadata(ctx, dimmingDurationValue);
		}

		this.setInterviewComplete(ctx, true);
	}

	// `refreshValues()` would create 255 `Get` commands to be issued to the node
	// Therefore, I think we should not implement it. Here is how it would be implemented
	//
	// public async refreshValues(ctx: RefreshValuesContext): Promise<void> {
	// 	const node = this.getNode(ctx)!;
	// 	const endpoint = this.getEndpoint(ctx)!;
	// 	const api = endpoint.commandClasses[
	// 		"Scene Actuator Configuration"
	// 	].withOptions({
	// 		priority: MessagePriority.NodeQuery,
	// 	});
	// 	ctx.logNode(node.id, {
	// 		message: "querying all scene actuator configs...",
	// 		direction: "outbound",
	// 	});
	// 	for (let sceneId = 1; sceneId <= 255; sceneId++) {
	// 		await api.get(sceneId);
	// 	}
	// }
}

// @publicAPI
export interface SceneActuatorConfigurationCCSetOptions {
	sceneId: number;
	dimmingDuration: Duration;
	level?: number;
}

@CCCommand(SceneActuatorConfigurationCommand.Set)
@useSupervision()
export class SceneActuatorConfigurationCCSet
	extends SceneActuatorConfigurationCC
{
	public constructor(
		options: WithAddress<SceneActuatorConfigurationCCSetOptions>,
	) {
		super(options);
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

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): SceneActuatorConfigurationCCSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SceneActuatorConfigurationCCSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public sceneId: number;
	public dimmingDuration: Duration;
	public level?: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.sceneId,
			this.dimmingDuration.serializeSet(),
			this.level != undefined ? 0b1000_0000 : 0,
			this.level ?? 0xff,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			sceneId: this.sceneId,
			dimmingDuration: this.dimmingDuration.toString(),
		};
		if (this.level != undefined) {
			message.level = this.level;
		}

		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface SceneActuatorConfigurationCCReportOptions {
	sceneId: number;
	level?: number;
	dimmingDuration?: Duration;
}

@CCCommand(SceneActuatorConfigurationCommand.Report)
export class SceneActuatorConfigurationCCReport
	extends SceneActuatorConfigurationCC
{
	public constructor(
		options: WithAddress<SceneActuatorConfigurationCCReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.sceneId = options.sceneId;
		this.level = options.level;
		this.dimmingDuration = options.dimmingDuration;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SceneActuatorConfigurationCCReport {
		validatePayload(raw.payload.length >= 3);
		const sceneId = raw.payload[0];

		let level: number | undefined;
		let dimmingDuration: Duration | undefined;
		if (sceneId !== 0) {
			level = raw.payload[1];
			dimmingDuration = Duration.parseReport(raw.payload[2])
				?? Duration.unknown();
		}

		return new SceneActuatorConfigurationCCReport({
			nodeId: ctx.sourceNodeId,
			sceneId,
			level,
			dimmingDuration,
		});
	}

	public readonly sceneId: number;
	public readonly level?: number;
	public readonly dimmingDuration?: Duration;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Do not persist values for an inactive scene
		if (
			this.sceneId === 0
			|| this.level == undefined
			|| this.dimmingDuration == undefined
		) {
			return false;
		}

		const levelValue = SceneActuatorConfigurationCCValues.level(
			this.sceneId,
		);
		this.ensureMetadata(ctx, levelValue);

		const dimmingDurationValue = SceneActuatorConfigurationCCValues
			.dimmingDuration(this.sceneId);
		this.ensureMetadata(ctx, dimmingDurationValue);

		this.setValue(ctx, levelValue, this.level);
		this.setValue(ctx, dimmingDurationValue, this.dimmingDuration);

		return true;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			sceneId: this.sceneId,
		};
		if (this.dimmingDuration != undefined) {
			message.dimmingDuration = this.dimmingDuration.toString();
		}
		if (this.level != undefined) {
			message.level = this.level;
		}

		return {
			...super.toLogEntry(ctx),
			message,
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

// @publicAPI
export interface SceneActuatorConfigurationCCGetOptions {
	sceneId: number;
}

@CCCommand(SceneActuatorConfigurationCommand.Get)
@expectedCCResponse(
	SceneActuatorConfigurationCCReport,
	testResponseForSceneActuatorConfigurationGet,
)
export class SceneActuatorConfigurationCCGet
	extends SceneActuatorConfigurationCC
{
	public constructor(
		options: WithAddress<SceneActuatorConfigurationCCGetOptions>,
	) {
		super(options);
		this.sceneId = options.sceneId;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): SceneActuatorConfigurationCCGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SceneActuatorConfigurationCCGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public sceneId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.sceneId]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "scene id": this.sceneId },
		};
	}
}
