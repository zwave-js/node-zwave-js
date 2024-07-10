import {
	CommandClasses,
	Duration,
	type IZWaveEndpoint,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	getCCName,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
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
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
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
import { SceneControllerConfigurationCommand } from "../lib/_Types";
import { AssociationCC } from "./AssociationCC";

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
					this.applHost,
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

		const cc = new SceneControllerConfigurationCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			sceneId,
			dimmingDuration,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
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

		const cc = new SceneControllerConfigurationCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId: 0,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new SceneControllerConfigurationCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response = await this.applHost.sendCommand<
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
	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const groupCount = SceneControllerConfigurationCC.getGroupCountCached(
			applHost,
			endpoint,
		);
		if (groupCount === 0) {
			applHost.controllerLog.logNode(node.id, {
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
			this.ensureMetadata(applHost, sceneIdValue);

			const dimmingDurationValue = SceneControllerConfigurationCCValues
				.dimmingDuration(groupId);
			this.ensureMetadata(applHost, dimmingDurationValue);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Scene Controller Configuration"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const groupCount = SceneControllerConfigurationCC.getGroupCountCached(
			applHost,
			endpoint,
		);

		applHost.controllerLog.logNode(node.id, {
			message: "querying all scene controller configurations...",
			direction: "outbound",
		});
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			applHost.controllerLog.logNode(node.id, {
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
				applHost.controllerLog.logNode(node.id, {
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
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): number {
		return (
			applHost.getDeviceConfig?.(endpoint.nodeId)?.compat
				?.forceSceneControllerGroupCount
				?? AssociationCC.getGroupCountCached(applHost, endpoint)
				?? 0
		);
	}
}

// @publicAPI
export interface SceneControllerConfigurationCCSetOptions
	extends CCCommandOptions
{
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| SceneControllerConfigurationCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.groupId = options.groupId;
			this.sceneId = options.sceneId;
			// if dimmingDuration was missing, use default duration.
			this.dimmingDuration = Duration.from(options.dimmingDuration)
				?? Duration.default();
		}
	}

	public groupId: number;
	public sceneId: number;
	public dimmingDuration: Duration;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.groupId,
			this.sceneId,
			this.dimmingDuration.serializeSet(),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"group id": this.groupId,
				"scene id": this.sceneId,
				"dimming duration": this.dimmingDuration.toString(),
			},
		};
	}
}

@CCCommand(SceneControllerConfigurationCommand.Report)
export class SceneControllerConfigurationCCReport
	extends SceneControllerConfigurationCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 3);
		this.groupId = this.payload[0];
		this.sceneId = this.payload[1];
		this.dimmingDuration = Duration.parseReport(this.payload[2])
			?? Duration.unknown();
	}

	public readonly groupId: number;
	public readonly sceneId: number;
	public readonly dimmingDuration: Duration;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// If groupId = 0, values are meaningless
		if (this.groupId === 0) return false;

		const sceneIdValue = SceneControllerConfigurationCCValues.sceneId(
			this.groupId,
		);
		this.ensureMetadata(applHost, sceneIdValue);
		const dimmingDurationValue = SceneControllerConfigurationCCValues
			.dimmingDuration(this.groupId);
		this.ensureMetadata(applHost, dimmingDurationValue);

		this.setValue(applHost, sceneIdValue, this.sceneId);
		this.setValue(applHost, dimmingDurationValue, this.dimmingDuration);

		return true;
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
export interface SceneControllerConfigurationCCGetOptions
	extends CCCommandOptions
{
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| SceneControllerConfigurationCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.groupId = options.groupId;
		}
	}

	public groupId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.groupId]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "group id": this.groupId },
		};
	}
}
