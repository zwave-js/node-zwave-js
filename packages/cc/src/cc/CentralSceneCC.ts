import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	MessagePriority,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	API,
	CCCommand,
	ccValue,
	ccValueMetadata,
	commandClass,
	CommandClass,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import * as ccUtils from "../lib/utils";
import { CentralSceneCommand, CentralSceneKeys } from "../lib/_Types";
import { AssociationGroupInfoCC } from "./AssociationGroupInfoCC";

/** Returns the ValueID used to store the current value of a Central Scene */
export function getSceneValueId(sceneNumber: number): ValueID {
	return {
		commandClass: CommandClasses["Central Scene"],
		property: "scene",
		propertyKey: padStart(sceneNumber.toString(), 3, "0"),
	};
}

function getSceneLabel(sceneNumber: number): string {
	return `Scene ${padStart(sceneNumber.toString(), 3, "0")}`;
}

export function getSlowRefreshValueId(): ValueID {
	return {
		commandClass: CommandClasses["Central Scene"],
		property: "slowRefresh",
	};
}

@API(CommandClasses["Central Scene"])
export class CentralSceneCCAPI extends CCAPI {
	public supportsCommand(cmd: CentralSceneCommand): Maybe<boolean> {
		switch (cmd) {
			case CentralSceneCommand.SupportedGet:
				return this.isSinglecast(); // this is mandatory
			case CentralSceneCommand.ConfigurationGet:
				return this.version >= 3 && this.isSinglecast();
			case CentralSceneCommand.ConfigurationSet:
				return this.version >= 3;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupported() {
		this.assertSupportsCommand(
			CentralSceneCommand,
			CentralSceneCommand.SupportedGet,
		);

		const cc = new CentralSceneCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<CentralSceneCCSupportedReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"sceneCount",
				"supportsSlowRefresh",
				"supportedKeyAttributes",
			]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getConfiguration() {
		this.assertSupportsCommand(
			CentralSceneCommand,
			CentralSceneCommand.ConfigurationGet,
		);

		const cc = new CentralSceneCCConfigurationGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<CentralSceneCCConfigurationReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, ["slowRefresh"]);
		}
	}

	@validateArgs()
	public async setConfiguration(slowRefresh: boolean): Promise<void> {
		this.assertSupportsCommand(
			CentralSceneCommand,
			CentralSceneCommand.ConfigurationSet,
		);

		const cc = new CentralSceneCCConfigurationSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			slowRefresh,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "slowRefresh") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "boolean") {
			throwWrongValueType(this.ccId, property, "boolean", typeof value);
		}
		await this.setConfiguration(value);
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		if (property === "slowRefresh") {
			return (await this.getConfiguration())?.[property];
		}
		throwUnsupportedProperty(this.ccId, property);
	};
}

@commandClass(CommandClasses["Central Scene"])
@implementedVersion(3)
export class CentralSceneCC extends CommandClass {
	declare ccCommand: CentralSceneCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses.Association,
			CommandClasses["Multi Channel Association"],
			CommandClasses["Association Group Information"],
		];
	}

	public skipEndpointInterview(): boolean {
		// Central scene notifications are issued by the root device
		return true;
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Central Scene"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// If one Association group issues CentralScene notifications,
		// we need to associate ourselves with that channel
		if (
			node.supportsCC(CommandClasses["Association Group Information"]) &&
			(node.supportsCC(CommandClasses.Association) ||
				node.supportsCC(CommandClasses["Multi Channel Association"]))
		) {
			const groupsIssueingNotifications =
				AssociationGroupInfoCC.findGroupsForIssuedCommand(
					applHost,
					node,
					this.ccId,
					CentralSceneCommand.Notification,
				);
			if (groupsIssueingNotifications.length > 0) {
				// We always grab the first group - usually it should be the lifeline
				const groupId = groupsIssueingNotifications[0];
				const existingAssociations =
					ccUtils.getAssociations(applHost, node).get(groupId) ?? [];

				if (
					!existingAssociations.some(
						(a) => a.nodeId === applHost.ownNodeId,
					)
				) {
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"Configuring associations to receive Central Scene notifications...",
						direction: "outbound",
					});
					await ccUtils.addAssociations(applHost, node, groupId, [
						{ nodeId: applHost.ownNodeId },
					]);
				}
			}
		}

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying supported scenes...",
			direction: "outbound",
		});
		const ccSupported = await api.getSupported();
		if (ccSupported) {
			const logMessage = `received supported scenes:
# of scenes:           ${ccSupported.sceneCount}
supports slow refresh: ${ccSupported.supportsSlowRefresh}`;
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported scenes timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// The slow refresh capability should be enabled whenever possible
		if (this.version >= 3 && ccSupported?.supportsSlowRefresh) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "Enabling slow refresh capability...",
				direction: "outbound",
			});
			await api.setConfiguration(true);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}
}

@CCCommand(CentralSceneCommand.Notification)
export class CentralSceneCCNotification extends CentralSceneCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 3);
		this._sequenceNumber = this.payload[0];
		this._keyAttribute = this.payload[1] & 0b111;
		this._sceneNumber = this.payload[2];
		if (
			this._keyAttribute === CentralSceneKeys.KeyHeldDown &&
			this.version >= 3
		) {
			// A receiving node MUST ignore this field if the command is not
			// carrying the Key Held Down key attribute.
			this._slowRefresh = !!(this.payload[1] & 0b1000_0000);
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		const valueDB = this.getValueDB(applHost);

		// In case the interview is not yet completed, we still create some basic metadata
		const valueId = getSceneValueId(this._sceneNumber);
		if (!valueDB.hasMetadata(valueId)) {
			valueDB.setMetadata(valueId, {
				...ValueMetadata.ReadOnlyUInt8,
				label: getSceneLabel(this._sceneNumber),
			});
		}

		// The spec behavior is pretty complicated, so we cannot just store
		// the value and call it a day. Handling of these notifications will
		// happen in the receiving node class

		return true;
	}

	private _sequenceNumber: number;
	public get sequenceNumber(): number {
		return this._sequenceNumber;
	}

	private _keyAttribute: CentralSceneKeys;
	public get keyAttribute(): CentralSceneKeys {
		return this._keyAttribute;
	}

	private _sceneNumber: number;
	public get sceneNumber(): number {
		return this._sceneNumber;
	}

	private _slowRefresh: boolean | undefined;
	public get slowRefresh(): boolean | undefined {
		return this._slowRefresh;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"sequence number": this.sequenceNumber,
			"key attribute": getEnumMemberName(
				CentralSceneKeys,
				this.keyAttribute,
			),
			"scene number": this.sceneNumber,
		};
		if (this.slowRefresh != undefined) {
			message["slow refresh"] = this.slowRefresh;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(CentralSceneCommand.SupportedReport)
export class CentralSceneCCSupportedReport extends CentralSceneCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this._sceneCount = this.payload[0];
		this._supportsSlowRefresh =
			this.version >= 3 ? !!(this.payload[1] & 0b1000_0000) : undefined;
		const bitMaskBytes = (this.payload[1] & 0b110) >>> 1;
		const identicalKeyAttributes = !!(this.payload[1] & 0b1);
		const numEntries = identicalKeyAttributes ? 1 : this.sceneCount;

		validatePayload(this.payload.length >= 2 + bitMaskBytes * numEntries);
		for (let i = 0; i < numEntries; i++) {
			const mask = this.payload.slice(
				2 + i * bitMaskBytes,
				2 + (i + 1) * bitMaskBytes,
			);
			this._supportedKeyAttributes.set(
				i + 1,
				parseBitMask(mask, CentralSceneKeys.KeyPressed),
			);
		}
		if (identicalKeyAttributes) {
			// The key attributes are only transmitted for scene 1, copy them to the others
			for (let i = 2; i <= this._sceneCount; i++) {
				this._supportedKeyAttributes.set(
					i,
					this._supportedKeyAttributes.get(1)!,
				);
			}
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Create metadata for all scenes
		const valueDB = this.getValueDB(applHost);
		for (let i = 1; i <= this._sceneCount; i++) {
			const valueId = getSceneValueId(i);
			valueDB.setMetadata(valueId, {
				...ValueMetadata.ReadOnlyUInt8,
				label: getSceneLabel(i),
				states: enumValuesToMetadataStates(
					CentralSceneKeys,
					this._supportedKeyAttributes.get(i),
				),
			});
		}

		return true;
	}

	private _sceneCount: number;
	@ccValue({ internal: true })
	public get sceneCount(): number {
		return this._sceneCount;
	}

	// TODO: Only offer `slowRefresh` if this is true
	private _supportsSlowRefresh: boolean | undefined;
	@ccValue({ internal: true })
	public get supportsSlowRefresh(): boolean | undefined {
		return this._supportsSlowRefresh;
	}

	private _supportedKeyAttributes = new Map<
		number,
		readonly CentralSceneKeys[]
	>();
	@ccValue({ internal: true })
	public get supportedKeyAttributes(): ReadonlyMap<
		number,
		readonly CentralSceneKeys[]
	> {
		return this._supportedKeyAttributes;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"scene count": this.sceneCount,
			"supports slow refresh": this.supportsSlowRefresh,
		};
		for (const [scene, keys] of this.supportedKeyAttributes) {
			message[`supported attributes (scene #${scene})`] = keys
				.map((k) => `\n· ${getEnumMemberName(CentralSceneKeys, k)}`)
				.join("");
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}

	// private _keyAttributesHaveIdenticalSupport: boolean;
	// @ccValue({ internal: true })
	// public get keyAttributesHaveIdenticalSupport(): boolean {
	// 	return this._keyAttributesHaveIdenticalSupport;
	// }

	// public supportsKeyAttribute(
	// 	sceneNumber: number,
	// 	keyAttribute: CentralSceneKeys,
	// ): boolean {
	// 	const mapIndex = this._keyAttributesHaveIdenticalSupport
	// 		? 1
	// 		: sceneNumber;
	// 	return this._supportedKeyAttributes
	// 		.get(mapIndex)!
	// 		.includes(keyAttribute);
	// }
}

@CCCommand(CentralSceneCommand.SupportedGet)
@expectedCCResponse(CentralSceneCCSupportedReport)
export class CentralSceneCCSupportedGet extends CentralSceneCC {}

@CCCommand(CentralSceneCommand.ConfigurationReport)
export class CentralSceneCCConfigurationReport extends CentralSceneCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._slowRefresh = !!(this.payload[0] & 0b1000_0000);
	}

	private _slowRefresh: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Boolean,
		label: "Send held down notifications at a slow rate",
		description:
			"When this is true, KeyHeldDown notifications are sent every 55s. " +
			"When this is false, the notifications are sent every 200ms.",
	})
	public get slowRefresh(): boolean {
		return this._slowRefresh;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "slow refresh": this._slowRefresh },
		};
	}
}

@CCCommand(CentralSceneCommand.ConfigurationGet)
@expectedCCResponse(CentralSceneCCConfigurationReport)
export class CentralSceneCCConfigurationGet extends CentralSceneCC {}

interface CentralSceneCCConfigurationSetOptions extends CCCommandOptions {
	slowRefresh: boolean;
}

@CCCommand(CentralSceneCommand.ConfigurationSet)
export class CentralSceneCCConfigurationSet extends CentralSceneCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| CentralSceneCCConfigurationSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.slowRefresh = options.slowRefresh;
		}
	}

	public slowRefresh: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.slowRefresh ? 0b1000_0000 : 0]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "slow refresh": this.slowRefresh },
		};
	}
}
