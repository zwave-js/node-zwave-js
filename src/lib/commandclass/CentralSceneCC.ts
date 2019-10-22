import { padStart } from "alcalzone-shared/strings";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { ValueID } from "../node/ValueDB";
import { JSONObject, validatePayload } from "../util/misc";
import { enumValuesToMetadataStates, ValueMetadata } from "../values/Metadata";
import { Maybe, parseBitMask } from "../values/Primitive";
import {
	CCAPI,
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
import { CommandClasses } from "./CommandClasses";

/** Returns the ValueID used to store the maximum number of nodes of an association group */
export function getSceneValueId(sceneNumber: number): ValueID {
	return {
		commandClass: CommandClasses["Central Scene"],
		propertyName: "scene",
		propertyKey: padStart(sceneNumber.toString(), 3, "0"),
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
				return true; // this is mandatory
			case CentralSceneCommand.ConfigurationGet:
			case CentralSceneCommand.ConfigurationSet:
				return this.version >= 3;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getSupported() {
		const cc = new CentralSceneCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			CentralSceneCCSupportedReport
		>(cc))!;
		return {
			sceneCount: response.sceneCount,
			supportsSlowRefresh: response.supportsSlowRefresh,
			supportedKeyAttributes: response.supportedKeyAttributes,
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getConfiguration() {
		const cc = new CentralSceneCCConfigurationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			CentralSceneCCConfigurationReport
		>(cc))!;
		return {
			slowRefresh: response.slowRefresh,
		};
	}

	public async setConfiguration(slowRefresh: boolean): Promise<void> {
		const cc = new CentralSceneCCConfigurationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			slowRefresh,
		});
		await this.driver.sendCommand(cc);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ propertyName },
		value,
	): Promise<void> => {
		if (propertyName !== "slowRefresh") {
			throwUnsupportedProperty(this.ccId, propertyName);
		}
		if (typeof value !== "boolean") {
			throwWrongValueType(
				this.ccId,
				propertyName,
				"boolean",
				typeof value,
			);
		}
		await this.setConfiguration(value);
	};
}

export interface CentralSceneCC {
	ccCommand: CentralSceneCommand;
}

@commandClass(CommandClasses["Central Scene"])
@implementedVersion(3)
export class CentralSceneCC extends CommandClass {
	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses.Association,
			CommandClasses["Multi Channel Association"],
			CommandClasses["Association Group Information"],
		];
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const api = node.commandClasses["Central Scene"];

		log.controller.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		if (complete) {
			// I'm not sure if the specs require supporting nodes to also
			// support AGI and (Multi Channel) associations, but we assumet that
			// for now.

			// If one Association group issues CentralScene notifications,
			// we need to associate ourselves with that channel
			const groupsIssueingNotifications = node
				.createCCInstance(AssociationGroupInfoCC)!
				.findGroupsForIssuedCommand(
					this.ccId,
					CentralSceneCommand.Notification,
				);
			if (groupsIssueingNotifications.length > 0) {
				// We always grab the first group - usually it should be the lifeline
				const groupId = groupsIssueingNotifications[0];
				log.controller.logNode(node.id, {
					message:
						"Configuring associations to receive Central Scene notifications...",
					direction: "outbound",
				});
				await node.commandClasses.Association.addNodeIds(
					groupId,
					this.driver.controller.ownNodeId!,
				);

				log.controller.logNode(node.id, {
					message: "Querying supported scenes...",
					direction: "outbound",
				});
				const ccSupported = await api.getSupported();
				const logMessage = `received supported scenes:
# of scenes:           ${ccSupported.sceneCount}
supports slow refresh: ${ccSupported.supportsSlowRefresh}`;
				log.controller.logNode(node.id, {
					message: logMessage,
					direction: "inbound",
				});

				// The slow refresh capability should be enabled whenever possible
				if (this.version >= 3 && ccSupported.supportsSlowRefresh) {
					log.controller.logNode(node.id, {
						message: "Enabling slow refresh capability...",
						direction: "outbound",
					});
					await api.setConfiguration(true);
				}
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	// public static translatePropertyKey(
	// 	propertyName: string,
	// 	propertyKey: number | string,
	// ): string {
	// 	if (/^scene\d+/.test(propertyName)) {
	// 		return CentralSceneKeys[propertyKey as number];
	// 	} else {
	// 		return super.translatePropertyKey(propertyName, propertyKey);
	// 	}
	// }
}

@CCCommand(CentralSceneCommand.Notification)
export class CentralSceneCCNotification extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 3);
		this._sequenceNumber = this.payload[0];
		this._keyAttribute = this.payload[1] & 0b111;
		this._sceneNumber = this.payload[2];
		if (this._keyAttribute === CentralSceneKeys.KeyHeldDown) {
			// A receiving node MUST ignore this field if the command is not
			// carrying the Key Held Down key attribute.
			this._slowRefresh = !!(this.payload[1] & 0b1000_0000);
		}
		// The described behavior is pretty complicated, so we cannot just store
		// the value and call it a day. Handling of these notifications will
		// happen in the receiving node class
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

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			sequenceNumber: this.sequenceNumber,
			keyAttribute: CentralSceneKeys[this.keyAttribute],
			sceneNumber: this.sceneNumber,
			slowRefresh: this.slowRefresh,
		});
	}
}

@CCCommand(CentralSceneCommand.SupportedReport)
export class CentralSceneCCSupportedReport extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._sceneCount = this.payload[0];
		this._supportsSlowRefresh = !!(this.payload[1] & 0b1000_0000);
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
				label: `Scene ${padStart(i.toString(), 3, "0")}`,
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
	private _supportsSlowRefresh: boolean;
	@ccValue({ internal: true })
	public get supportsSlowRefresh(): boolean {
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
export class CentralSceneCCSupportedGet extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(CentralSceneCommand.ConfigurationReport)
export class CentralSceneCCConfigurationReport extends CentralSceneCC {
	public constructor(
		driver: IDriver,
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
}

@CCCommand(CentralSceneCommand.ConfigurationGet)
@expectedCCResponse(CentralSceneCCConfigurationReport)
export class CentralSceneCCConfigurationGet extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

interface CentralSceneCCConfigurationSetOptions extends CCCommandOptions {
	slowRefresh: boolean;
}

@CCCommand(CentralSceneCommand.ConfigurationSet)
export class CentralSceneCCConfigurationSet extends CentralSceneCC {
	public constructor(
		driver: IDriver,
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
}
