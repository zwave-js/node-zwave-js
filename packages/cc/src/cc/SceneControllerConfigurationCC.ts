import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import { type GetDeviceConfig } from "@zwave-js/config";
import {
	CommandClasses,
	Duration,
	type EndpointId,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	getCCName,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
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
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import { SceneControllerConfigurationCommand } from "../lib/_Types.js";
import { AssociationCC } from "./AssociationCC.js";

export const SceneControllerConfigurationCCValues = Object.freeze({
	...V.defineDynamicCCValues(
		CommandClasses["Scene Controller Configuration"],
		{
			...V.dynamicPropertyAndKeyWithName(
				"sceneId",
				"sceneId",
				(groupId: number) => groupId,
				({ property, propertyKey }) =>
					property === "sceneId" && typeof propertyKey === "number",
				(groupId: number) => ({
					...ValueMetadata.UInt8,
					label: `Associated Scene ID (${groupId})`,
					valueChangeOptions: ["transitionDuration"],
				} as const),
			),

			...V.dynamicPropertyAndKeyWithName(
				"dimmingDuration",
				"dimmingDuration",
				(groupId: number) => groupId,
				({ property, propertyKey }) =>
					property === "dimmingDuration"
					&& typeof propertyKey === "number",
				(groupId: number) => ({
					...ValueMetadata.Duration,
					label: `Dimming duration (${groupId})`,
				} as const),
			),
		},
	),
});

@API(CommandClasses["Scene Controller Configuration"])
export class SceneControllerConfigurationCCAPI extends CCAPI {
	public supportsCommand(
		cmd: SceneControllerConfigurationCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case SceneControllerConfigurationCommand.Get:
				return this.isSinglecast();
			case SceneControllerConfigurationCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: SceneControllerConfigurationCCAPI,
			{ property, propertyKey },
			value,
			options,
		) {
			if (propertyKey == undefined) {
				throwMissingPropertyKey(this.ccId, property);
			} else if (typeof propertyKey !== "number") {
				throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
			}
			if (property === "sceneId") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}

				if (value === 0) {
					// Disable Group ID / Scene ID
					return this.disable(propertyKey);
				} else {
					// We need to set the dimming duration along with the scene ID
					// Dimming duration is chosen with the following precedence:
					// 1. options.transitionDuration
					// 2. current stored value
					// 3. default value
					const dimmingDuration =
						Duration.from(options?.transitionDuration)
							?? this.tryGetValueDB()?.getValue<Duration>(
								SceneControllerConfigurationCCValues
									.dimmingDuration(
										propertyKey,
									).endpoint(this.endpoint.index),
							)
							?? Duration.default();
					return this.set(propertyKey, value, dimmingDuration);
				}
			} else if (property === "dimmingDuration") {
				if (typeof value !== "string" && !Duration.isDuration(value)) {
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

				const valueDB = this.tryGetValueDB();
				const sceneId = valueDB?.getValue<number>(
					SceneControllerConfigurationCCValues.sceneId(
						propertyKey,
					).endpoint(this.endpoint.index),
				);
				if (sceneId == undefined || sceneId === 0) {
					if (valueDB) {
						// Can't actually send dimmingDuration without valid sceneId
						// So we save it in the valueDB without sending it to the node
						const dimmingDurationValueId =
							SceneControllerConfigurationCCValues
								.dimmingDuration(
									propertyKey,
								).endpoint(this.endpoint.index);
						valueDB.setValue(
							dimmingDurationValueId,
							dimmingDuration,
						);
					}
					return;
				}

				return this.set(propertyKey, sceneId, dimmingDuration);
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: SceneControllerConfigurationCCAPI,
			{ property, propertyKey },
		) {
			switch (property) {
				case "sceneId":
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
	public async disable(
		groupId: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			SceneControllerConfigurationCommand,
			SceneControllerConfigurationCommand.Set,
		);

		return this.set(groupId, 0, new Duration(0, "seconds"));
	}

	@validateArgs()
	public async set(
		groupId: number,
		sceneId: number,
		dimmingDuration?: Duration | string,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			SceneControllerConfigurationCommand,
			SceneControllerConfigurationCommand.Set,
		);

		if (!this.endpoint.virtual) {
			const groupCount = SceneControllerConfigurationCC
				.getGroupCountCached(
					this.host,
					this.endpoint,
				);

			// The client SHOULD NOT specify group 1 (the life-line group).
			// We don't block it here, because the specs don't forbid it,
			// and it may be needed for some devices.
			if (groupId < 1 || groupId > groupCount) {
				throw new ZWaveError(
					`${this.constructor.name}: The group ID must be between 1 and the number of supported groups ${groupCount}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		} else if (groupId < 1) {
			throw new ZWaveError(
				`The group ID must be greater than 0.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new SceneControllerConfigurationCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			groupId,
			sceneId,
			dimmingDuration,
		});

		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getLastActivated(): Promise<
		MaybeNotKnown<
			Pick<
				SceneControllerConfigurationCCReport,
				"groupId" | "sceneId" | "dimmingDuration"
			>
		>
	> {
		this.assertSupportsCommand(
			SceneControllerConfigurationCommand,
			SceneControllerConfigurationCommand.Get,
		);

		const cc = new SceneControllerConfigurationCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			groupId: 0,
		});
		const response = await this.host.sendCommand<
			SceneControllerConfigurationCCReport
		>(
			cc,
			this.commandOptions,
		);

		// Return value includes "groupId", because
		// the returned report will include the actual groupId of the
		// last activated groupId / sceneId
		if (response) {
			return pick(response, ["groupId", "sceneId", "dimmingDuration"]);
		}
	}

	@validateArgs()
	public async get(
		groupId: number,
	): Promise<
		MaybeNotKnown<
			Pick<
				SceneControllerConfigurationCCReport,
				"sceneId" | "dimmingDuration"
			>
		>
	> {
		this.assertSupportsCommand(
			SceneControllerConfigurationCommand,
			SceneControllerConfigurationCommand.Get,
		);

		if (groupId === 0) {
			throw new ZWaveError(
				`Invalid group ID 0. To get the last activated group / scene, use getLastActivated() instead.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (groupId < 0) {
			throw new ZWaveError(
				`The group ID must be greater than 0.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new SceneControllerConfigurationCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			groupId,
		});
		const response = await this.host.sendCommand<
			SceneControllerConfigurationCCReport
		>(
			cc,
			this.commandOptions,
		);

		// Since groupId is not allowed to be 0, only Reports with
		// groupId equal to the requested groupId will be accepted,
		// so we can omit groupId from the return.
		if (response) {
			return pick(response, ["sceneId", "dimmingDuration"]);
		}
	}
}

@commandClass(CommandClasses["Scene Controller Configuration"])
@implementedVersion(1)
@ccValues(SceneControllerConfigurationCCValues)
export class SceneControllerConfigurationCC extends CommandClass {
	declare ccCommand: SceneControllerConfigurationCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// AssociationCC is required and MUST be interviewed
		// before SceneControllerConfigurationCC to supply groupCount
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses.Association,
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const groupCount = SceneControllerConfigurationCC.getGroupCountCached(
			ctx,
			endpoint,
		);
		if (groupCount === 0) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`skipping Scene Controller Configuration interview because Association group count is unknown`,
				direction: "none",
				level: "warn",
			});
			return;
		}

		// Create metadata for each scene, but don't query their actual configuration
		// since some devices only support setting scenes
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			const sceneIdValue = SceneControllerConfigurationCCValues.sceneId(
				groupId,
			);
			this.ensureMetadata(ctx, sceneIdValue);

			const dimmingDurationValue = SceneControllerConfigurationCCValues
				.dimmingDuration(groupId);
			this.ensureMetadata(ctx, dimmingDurationValue);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Scene Controller Configuration"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const groupCount = SceneControllerConfigurationCC.getGroupCountCached(
			ctx,
			endpoint,
		);

		ctx.logNode(node.id, {
			message: "querying all scene controller configurations...",
			direction: "outbound",
		});
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`querying scene configuration for group #${groupId}...`,
				direction: "outbound",
			});
			const group = await api.get(groupId);
			if (group != undefined) {
				const logMessage =
					`received scene configuration for group #${groupId}:
scene ID:         ${group.sceneId}
dimming duration: ${group.dimmingDuration.toString()}`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}

	/**
	 * Returns the number of association groups reported by the node.
	 * This only works AFTER the node has been interviewed by this CC
	 * or the AssociationCC.
	 */
	public static getGroupCountCached(
		ctx: GetValueDB & GetDeviceConfig,
		endpoint: EndpointId,
	): number {
		return ctx.getDeviceConfig?.(endpoint.nodeId)?.compat
			?.forceSceneControllerGroupCount
			?? AssociationCC.getGroupCountCached(ctx, endpoint)
			?? 0;
	}
}

// @publicAPI
export interface SceneControllerConfigurationCCSetOptions {
	groupId: number;
	sceneId: number;
	dimmingDuration?: Duration | string;
}

@CCCommand(SceneControllerConfigurationCommand.Set)
@useSupervision()
export class SceneControllerConfigurationCCSet
	extends SceneControllerConfigurationCC
{
	public constructor(
		options: WithAddress<SceneControllerConfigurationCCSetOptions>,
	) {
		super(options);
		this.groupId = options.groupId;
		this.sceneId = options.sceneId;
		// if dimmingDuration was missing, use default duration.
		this.dimmingDuration = Duration.from(options.dimmingDuration)
			?? Duration.default();
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): SceneControllerConfigurationCCSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SceneControllerConfigurationCCSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public groupId: number;
	public sceneId: number;
	public dimmingDuration: Duration;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([
			this.groupId,
			this.sceneId,
			this.dimmingDuration.serializeSet(),
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"group id": this.groupId,
				"scene id": this.sceneId,
				"dimming duration": this.dimmingDuration.toString(),
			},
		};
	}
}

// @publicAPI
export interface SceneControllerConfigurationCCReportOptions {
	groupId: number;
	sceneId: number;
	dimmingDuration: Duration;
}

@CCCommand(SceneControllerConfigurationCommand.Report)
export class SceneControllerConfigurationCCReport
	extends SceneControllerConfigurationCC
{
	public constructor(
		options: WithAddress<SceneControllerConfigurationCCReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.groupId = options.groupId;
		this.sceneId = options.sceneId;
		this.dimmingDuration = options.dimmingDuration;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SceneControllerConfigurationCCReport {
		validatePayload(raw.payload.length >= 3);
		const groupId = raw.payload[0];
		const sceneId = raw.payload[1];
		const dimmingDuration: Duration = Duration.parseReport(raw.payload[2])
			?? Duration.unknown();

		return new this({
			nodeId: ctx.sourceNodeId,
			groupId,
			sceneId,
			dimmingDuration,
		});
	}

	public readonly groupId: number;
	public readonly sceneId: number;
	public readonly dimmingDuration: Duration;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// If groupId = 0, values are meaningless
		if (this.groupId === 0) return false;

		const sceneIdValue = SceneControllerConfigurationCCValues.sceneId(
			this.groupId,
		);
		this.ensureMetadata(ctx, sceneIdValue);
		const dimmingDurationValue = SceneControllerConfigurationCCValues
			.dimmingDuration(this.groupId);
		this.ensureMetadata(ctx, dimmingDurationValue);

		this.setValue(ctx, sceneIdValue, this.sceneId);
		this.setValue(ctx, dimmingDurationValue, this.dimmingDuration);

		return true;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"group id": this.groupId,
				"scene id": this.sceneId,
				"dimming duration": this.dimmingDuration.toString(),
			},
		};
	}
}

function testResponseForSceneControllerConfigurationGet(
	sent: SceneControllerConfigurationCCGet,
	received: SceneControllerConfigurationCCReport,
) {
	// We expect a Scene Controller Configuration Report that matches
	// the requested groupId, unless groupId 0 was requested
	return sent.groupId === 0 || received.groupId === sent.groupId;
}

// @publicAPI
export interface SceneControllerConfigurationCCGetOptions {
	groupId: number;
}

@CCCommand(SceneControllerConfigurationCommand.Get)
@expectedCCResponse(
	SceneControllerConfigurationCCReport,
	testResponseForSceneControllerConfigurationGet,
)
export class SceneControllerConfigurationCCGet
	extends SceneControllerConfigurationCC
{
	public constructor(
		options: WithAddress<SceneControllerConfigurationCCGetOptions>,
	) {
		super(options);
		this.groupId = options.groupId;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): SceneControllerConfigurationCCGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SceneControllerConfigurationCCGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public groupId: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.groupId]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "group id": this.groupId },
		};
	}
}
