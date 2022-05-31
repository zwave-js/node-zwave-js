import {
	CommandClasses,
	Duration,
	getCCName,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveEndpointBase,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { pick } from "@zwave-js/shared";
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
} from "./API";
import { AssociationCC } from "./AssociationCC";
import {
	API,
	CCCommand,
	commandClass,
	CommandClass,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "./CommandClass";
import { SceneControllerConfigurationCommand } from "./_Types";

export function getSceneIdValueID(
	endpoint: number | undefined,
	groupId: number,
): ValueID {
	return {
		commandClass: CommandClasses["Scene Controller Configuration"],
		endpoint,
		property: "sceneId",
		propertyKey: groupId,
	};
}

export function getDimmingDurationValueID(
	endpoint: number | undefined,
	groupId: number,
): ValueID {
	return {
		commandClass: CommandClasses["Scene Controller Configuration"],
		endpoint,
		property: "dimmingDuration",
		propertyKey: groupId,
	};
}

function setSceneConfigurationMetadata(
	this: SceneControllerConfigurationCC,
	applHost: ZWaveApplicationHost,
	groupId: number,
) {
	const valueDB = this.getValueDB(applHost);
	const sceneIdValueId = getSceneIdValueID(this.endpointIndex, groupId);
	const dimmingDurationValueId = getDimmingDurationValueID(
		this.endpointIndex,
		groupId,
	);

	if (!valueDB.hasMetadata(sceneIdValueId)) {
		valueDB.setMetadata(sceneIdValueId, {
			...ValueMetadata.UInt8,
			label: `Associated Scene ID (${groupId})`,
			valueChangeOptions: ["transitionDuration"],
		});
	}
	if (!valueDB.hasMetadata(dimmingDurationValueId)) {
		valueDB.setMetadata(dimmingDurationValueId, {
			...ValueMetadata.Duration,
			label: `Dimming duration (${groupId})`,
		});
	}
}

function persistSceneConfig(
	this: SceneControllerConfigurationCC,
	applHost: ZWaveApplicationHost,
	groupId: number,
	sceneId: number,
	dimmingDuration: Duration,
) {
	const valueDB = this.getValueDB(applHost);
	const sceneIdValueId = getSceneIdValueID(this.endpointIndex, groupId);
	const dimmingDurationValueId = getDimmingDurationValueID(
		this.endpointIndex,
		groupId,
	);

	if (
		!valueDB.hasMetadata(sceneIdValueId) ||
		!valueDB.hasMetadata(dimmingDurationValueId)
	) {
		setSceneConfigurationMetadata.call(this, applHost, groupId);
	}

	valueDB.setValue(sceneIdValueId, sceneId);
	valueDB.setValue(dimmingDurationValueId, dimmingDuration);

	return true;
}

@API(CommandClasses["Scene Controller Configuration"])
export class SceneControllerConfigurationCCAPI extends CCAPI {
	public supportsCommand(
		cmd: SceneControllerConfigurationCommand,
	): Maybe<boolean> {
		switch (cmd) {
			case SceneControllerConfigurationCommand.Get:
				return this.isSinglecast();
			case SceneControllerConfigurationCommand.Set:
				return true; // This is mandatory
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
				await this.disable(propertyKey);
			} else {
				// We need to set the dimming duration along with the scene ID
				// Dimming duration is chosen with the following precedence:
				// 1. options.transitionDuration
				// 2. current stored value
				// 3. default value
				const dimmingDuration =
					Duration.from(options?.transitionDuration) ??
					this.endpoint
						.getNodeUnsafe()!
						.getValue<Duration>(
							getDimmingDurationValueID(
								this.endpoint.index,
								propertyKey,
							),
						) ??
					new Duration(0, "default");
				await this.set(propertyKey, value, dimmingDuration);
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
					`${getCCName(
						this.ccId,
					)}: "${property}" could not be set. ${JSON.stringify(
						value,
					)} is not a valid duration.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			const node = this.endpoint.getNodeUnsafe()!;
			const sceneId = node.getValue<number>(
				getSceneIdValueID(this.endpoint.index, propertyKey),
			);
			if (sceneId == undefined || sceneId === 0) {
				// Can't actually send dimmingDuration without valid sceneId
				// So we save it in the valueDB without sending it to the node
				const dimmingDurationValueId = getDimmingDurationValueID(
					this.endpoint.index,
					propertyKey,
				);
				const valueDB = node.valueDB;
				valueDB.setValue(dimmingDurationValueId, dimmingDuration);
				return;
			}

			await this.set(propertyKey, sceneId, dimmingDuration);
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
		propertyKey,
	}): Promise<unknown> => {
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

	@validateArgs()
	public async disable(groupId: number): Promise<void> {
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
	): Promise<void> {
		this.assertSupportsCommand(
			SceneControllerConfigurationCommand,
			SceneControllerConfigurationCommand.Set,
		);

		if (!this.endpoint.virtual) {
			const groupCount =
				SceneControllerConfigurationCC.getGroupCountCached(
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

		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getLastActivated(): Promise<
		| Pick<
				SceneControllerConfigurationCCReport,
				"groupId" | "sceneId" | "dimmingDuration"
		  >
		| undefined
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
		const response =
			await this.applHost.sendCommand<SceneControllerConfigurationCCReport>(
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
		| Pick<
				SceneControllerConfigurationCCReport,
				"sceneId" | "dimmingDuration"
		  >
		| undefined
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
		const response =
			await this.applHost.sendCommand<SceneControllerConfigurationCCReport>(
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
				message: `skipping Scene Controller Configuration interview because Association group count is unknown`,
				direction: "none",
				level: "warn",
			});
			return;
		}

		// Create metadata for each scene, but don't query their actual configuration
		// since some devices only support setting scenes
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			setSceneConfigurationMetadata.call(this, applHost, groupId);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = endpoint.commandClasses[
			"Scene Controller Configuration"
		].withOptions({
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
				message: `querying scene configuration for group #${groupId}...`,
				direction: "outbound",
			});
			const group = await api.get(groupId);
			if (group != undefined) {
				const logMessage = `received scene configuration for group #${groupId}:
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
		endpoint: ZWaveEndpointBase,
	): number {
		return (
			applHost.getCompatConfig?.(endpoint.nodeId)
				?.forceSceneControllerGroupCount ??
			AssociationCC.getGroupCountCached(applHost, endpoint) ??
			0
		);
	}
}

interface SceneControllerConfigurationCCSetOptions extends CCCommandOptions {
	groupId: number;
	sceneId: number;
	dimmingDuration?: Duration | string;
}

@CCCommand(SceneControllerConfigurationCommand.Set)
export class SceneControllerConfigurationCCSet extends SceneControllerConfigurationCC {
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
			this.dimmingDuration =
				Duration.from(options.dimmingDuration) ??
				new Duration(0, "default");
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"group id": this.groupId,
				"scene id": this.sceneId,
				"dimming duration": this.dimmingDuration.toString(),
			},
		};
	}
}

@CCCommand(SceneControllerConfigurationCommand.Report)
export class SceneControllerConfigurationCCReport extends SceneControllerConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 3);
		this.groupId = this.payload[0];
		this.sceneId = this.payload[1];
		this.dimmingDuration =
			Duration.parseReport(this.payload[2]) ?? new Duration(0, "unknown");
	}

	public readonly groupId: number;
	public readonly sceneId: number;
	public readonly dimmingDuration: Duration;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// If groupId = 0, values are meaningless
		if (this.groupId === 0) return false;
		return persistSceneConfig.call(
			this,
			applHost,
			this.groupId,
			this.sceneId,
			this.dimmingDuration,
		);
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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

interface SceneControllerConfigurationCCGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(SceneControllerConfigurationCommand.Get)
@expectedCCResponse(
	SceneControllerConfigurationCCReport,
	testResponseForSceneControllerConfigurationGet,
)
export class SceneControllerConfigurationCCGet extends SceneControllerConfigurationCC {
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "group id": this.groupId },
		};
	}
}
