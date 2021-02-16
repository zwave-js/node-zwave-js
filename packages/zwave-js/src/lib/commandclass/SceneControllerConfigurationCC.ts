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
import { MessagePriority } from "../message/Constants";
import {
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "./API";
import { getGroupCountValueId } from "./AssociationCC";
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
export enum SceneControllerConfigurationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

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

function persistSceneConfig(
	this: SceneControllerConfigurationCC,
	groupId: number,
	sceneId: number,
	dimmingDuration: Duration,
) {
	const sceneIdValueId = getSceneIdValueID(this.endpointIndex, groupId);
	const dimmingDurationValueId = getDimmingDurationValueID(
		this.endpointIndex,
		groupId,
	);
	const valueDB = this.getValueDB();

	if (!valueDB.hasMetadata(sceneIdValueId)) {
		valueDB.setMetadata(sceneIdValueId, {
			...ValueMetadata.Number,
			min: 0,
			max: 255,
			label: `Associated Scene ID (${groupId})`,
		});
	}
	if (!valueDB.hasMetadata(dimmingDurationValueId)) {
		valueDB.setMetadata(dimmingDurationValueId, {
			...ValueMetadata.Duration,
			label: `Dimming duration (${groupId})`,
		});
	}

	valueDB.setValue(sceneIdValueId, sceneId);
	valueDB.setValue(dimmingDurationValueId, dimmingDuration);

	return true;
}

@API(CommandClasses["Scene Controller Configuration"])
export class SceneControllerConfigurationCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: SceneControllerConfigurationCommand,
	): Maybe<boolean> {
		switch (cmd) {
			case SceneControllerConfigurationCommand.Get:
			case SceneControllerConfigurationCommand.Set:
			case SceneControllerConfigurationCommand.Report:
				return true; // This is mandatory
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
				const node = this.endpoint.getNodeUnsafe()!;
				// If duration is missing, we set a default of instant
				const dimmingDuration =
					node.getValue<Duration>(
						getDimmingDurationValueID(
							this.endpoint.index,
							propertyKey,
						),
					) ?? new Duration(0, "seconds");
				await this.set(propertyKey, value, dimmingDuration);
			}
		} else {
			// setting dimmingDuration value alone not supported,
			// because I'm not sure how to handle a Duration value
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

	public async disable(groupId: number): Promise<void> {
		this.assertSupportsCommand(
			SceneControllerConfigurationCommand,
			SceneControllerConfigurationCommand.Set,
		);

		return this.set(groupId, 0, new Duration(0, "seconds"));
	}

	public async set(
		groupId: number,
		sceneId: number,
		dimmingDuration: Duration,
	): Promise<void> {
		this.assertSupportsCommand(
			SceneControllerConfigurationCommand,
			SceneControllerConfigurationCommand.Set,
		);

		const cc = new SceneControllerConfigurationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			sceneId,
			dimmingDuration,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getLastActivated(): Promise<
		| {
				groupId: number;
				sceneId: number;
				dimmingDuration: Duration;
		  }
		| undefined
	> {
		this.assertSupportsCommand(
			SceneControllerConfigurationCommand,
			SceneControllerConfigurationCommand.Get,
		);
		return this.get(0);
	}

	public async get(
		groupId: number,
	): Promise<
		| {
				groupId: number;
				sceneId: number;
				dimmingDuration: Duration;
		  }
		| undefined
	> {
		this.assertSupportsCommand(
			SceneControllerConfigurationCommand,
			SceneControllerConfigurationCommand.Get,
		);

		const cc = new SceneControllerConfigurationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response = await this.driver.sendCommand<SceneControllerConfigurationCCReport>(
			cc,
			this.commandOptions,
		);

		// Return value includes "groupId", because if get(0) is called
		// the returned report will include the actual groupId of the
		// last activated groupId / sceneId
		if (response)
			return pick(response, ["groupId", "sceneId", "dimmingDuration"]);
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

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses[
			"Scene Controller Configuration"
		].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		const groupCount = this.getGroupCountCached();
		if (groupCount === 0) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `skipping Scene Controller Configuration interview because Association group count is unknown`,
				direction: "none",
				level: "warn",
			});
			return;
		}

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `supports ${groupCount} association groups`,
			direction: "none",
		});

		// Always query scene and dimmer duration for each association group
		// skipping group #1, which is reserved for Lifeline
		for (let groupId = 2; groupId <= groupCount; groupId++) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying scene configuration for association group #${groupId}...`,
				direction: "outbound",
			});
			const group = await api.get(groupId);
			if (group != undefined) {
				const logMessage = `received scene configuration for association group #${groupId}:
scene ID:         ${group.sceneId}
dimming duration: ${group.dimmingDuration.toString()}`;
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	/**
	 * Returns the number of association groups reported by the node.
	 * This only works AFTER the node has been interviewed by this CC
	 * or the AssociationCC.
	 */
	public getGroupCountCached(): number {
		return this.getValueDB().getValue(getGroupCountValueId()) ?? 0;
	}
}

interface SceneControllerConfigurationCCSetOptions extends CCCommandOptions {
	groupId: number;
	sceneId: number;
	dimmingDuration: Duration;
}

@CCCommand(SceneControllerConfigurationCommand.Set)
export class SceneControllerConfigurationCCSet extends SceneControllerConfigurationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SceneControllerConfigurationCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			const groupCount = this.getGroupCountCached();
			this.groupId = options.groupId;
			this.sceneId = options.sceneId;
			this.dimmingDuration = options.dimmingDuration;

			if (this.groupId < 2 || this.groupId > groupCount) {
				throw new ZWaveError(
					`${this.constructor.name}: The user ID must be between 2 and the number of supported groups ${groupCount}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 3);
		this.groupId = this.payload[0];
		this.sceneId = this.payload[1];
		this.dimmingDuration =
			Duration.parseReport(this.payload[2]) ?? new Duration(0, "unknown");

		this.persistValues();
	}

	public readonly groupId: number;
	public readonly sceneId: number;
	public readonly dimmingDuration: Duration;

	public persistValues(): boolean {
		persistSceneConfig.call(
			this,
			this.groupId,
			this.sceneId,
			this.dimmingDuration,
		);
		return true;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"group id": this.groupId,
				"scene id": this.sceneId,
				"dimming duration": this.dimmingDuration.toString(),
			},
		};
	}
}

interface SceneControllerConfigurationCCGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(SceneControllerConfigurationCommand.Get)
@expectedCCResponse(SceneControllerConfigurationCCReport)
export class SceneControllerConfigurationCCGet extends SceneControllerConfigurationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SceneControllerConfigurationCCGetOptions,
	) {
		super(driver, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "group id": this.groupId },
		};
	}
}
