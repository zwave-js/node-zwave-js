import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { padStart } from "alcalzone-shared/strings";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import { AssociationGroupInfoCC } from "./AssociationGroupInfoCC";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

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

export enum CentralSceneCommand {
	SupportedGet = 0x01,
	SupportedReport = 0x02,
	Notification = 0x03,
	ConfigurationSet = 0x04,
	ConfigurationGet = 0x05,
	ConfigurationReport = 0x06,
}

/**
 * @publicAPI
 */
export enum CentralSceneKeys {
	KeyPressed = 0x00,
	KeyReleased = 0x01,
	KeyHeldDown = 0x02,
	KeyPressed2x = 0x03,
	KeyPressed3x = 0x04,
	KeyPressed4x = 0x05,
	KeyPressed5x = 0x06,
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

		const cc = new CentralSceneCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<CentralSceneCCSupportedReport>(
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

		const cc = new CentralSceneCCConfigurationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<CentralSceneCCConfigurationReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["slowRefresh"]);
		}
	}

	public async setConfiguration(slowRefresh: boolean): Promise<void> {
		this.assertSupportsCommand(
			CentralSceneCommand,
			CentralSceneCommand.ConfigurationSet,
		);

		const cc = new CentralSceneCCConfigurationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			slowRefresh,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
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

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Central Scene"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
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
			const groupsIssueingNotifications = node
				.createCCInstance(AssociationGroupInfoCC)!
				.findGroupsForIssuedCommand(
					this.ccId,
					CentralSceneCommand.Notification,
				);
			if (groupsIssueingNotifications.length > 0) {
				// We always grab the first group - usually it should be the lifeline
				const groupId = groupsIssueingNotifications[0];
				const existingAssociations =
					this.driver.controller
						.getAssociations({ nodeId: node.id })
						.get(groupId) ?? [];

				if (
					!existingAssociations.some(
						(a) => a.nodeId === this.driver.controller.ownNodeId,
					)
				) {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"Configuring associations to receive Central Scene notifications...",
						direction: "outbound",
					});
					await this.driver.controller.addAssociations(
						{ nodeId: node.id },
						groupId,
						[{ nodeId: this.driver.controller.ownNodeId! }],
					);
				}
			}
		}

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying supported scenes...",
			direction: "outbound",
		});
		const ccSupported = await api.getSupported();
		if (ccSupported) {
			const logMessage = `received supported scenes:
# of scenes:           ${ccSupported.sceneCount}
supports slow refresh: ${ccSupported.supportsSlowRefresh}`;
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported scenes timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// The slow refresh capability should be enabled whenever possible
		if (this.version >= 3 && ccSupported?.supportsSlowRefresh) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "Enabling slow refresh capability...",
				direction: "outbound",
			});
			await api.setConfiguration(true);
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(CentralSceneCommand.Notification)
export class CentralSceneCCNotification extends CentralSceneCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

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
		// The described behavior is pretty complicated, so we cannot just store
		// the value and call it a day. Handling of these notifications will
		// happen in the receiving node class

		// In case the interview is not yet completed, we still create some basic metadata
		const valueId = getSceneValueId(this._sceneNumber);
		const valueDB = this.getValueDB();
		if (!valueDB.hasMetadata(valueId)) {
			this.getValueDB().setMetadata(valueId, {
				...ValueMetadata.ReadOnlyUInt8,
				label: getSceneLabel(this._sceneNumber),
			});
		}
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

	public toLogEntry(): MessageOrCCLogEntry {
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
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(CentralSceneCommand.SupportedReport)
export class CentralSceneCCSupportedReport extends CentralSceneCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

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

		// Create metadata for all scenes
		for (let i = 1; i <= this._sceneCount; i++) {
			const valueId = getSceneValueId(i);
			this.getValueDB().setMetadata(valueId, {
				...ValueMetadata.ReadOnlyUInt8,
				label: getSceneLabel(i),
				states: enumValuesToMetadataStates(
					CentralSceneKeys,
					this._supportedKeyAttributes.get(i),
				),
			});
		}

		this.persistValues();
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

	public toLogEntry(): MessageOrCCLogEntry {
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
			...super.toLogEntry(),
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
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._slowRefresh = !!(this.payload[0] & 0b1000_0000);
		this.persistValues();
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| CentralSceneCCConfigurationSetOptions,
	) {
		super(driver, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "slow refresh": this.slowRefresh },
		};
	}
}
