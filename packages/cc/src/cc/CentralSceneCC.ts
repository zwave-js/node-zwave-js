import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	enumValuesToMetadataStates,
	getCCName,
	maybeUnknownToString,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
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
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { CentralSceneCommand, CentralSceneKeys } from "../lib/_Types";
import * as ccUtils from "../lib/utils";

export const CentralSceneCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Central Scene"], {
		...V.staticProperty("sceneCount", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsSlowRefresh", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedKeyAttributes", undefined, {
			internal: true,
		}),

		...V.staticProperty(
			"slowRefresh",
			{
				...ValueMetadata.Boolean,
				label: "Send held down notifications at a slow rate",
				description:
					"When this is true, KeyHeldDown notifications are sent every 55s. When this is false, the notifications are sent every 200ms.",
			} as const,
		),
	}),

	...V.defineDynamicCCValues(CommandClasses["Central Scene"], {
		...V.dynamicPropertyAndKeyWithName(
			"scene",
			"scene",
			(sceneNumber: number) => padStart(sceneNumber.toString(), 3, "0"),
			({ property, propertyKey }) =>
				property === "scene"
				&& typeof propertyKey === "string"
				&& /^\d{3}$/.test(propertyKey),
			(sceneNumber: number) => ({
				...ValueMetadata.ReadOnlyUInt8,
				label: `Scene ${padStart(sceneNumber.toString(), 3, "0")}`,
			} as const),
			{ stateful: false } as const,
		),
	}),
});

@API(CommandClasses["Central Scene"])
export class CentralSceneCCAPI extends CCAPI {
	public supportsCommand(cmd: CentralSceneCommand): MaybeNotKnown<boolean> {
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

		const cc = new CentralSceneCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			CentralSceneCCSupportedReport
		>(
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

		const cc = new CentralSceneCCConfigurationGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			CentralSceneCCConfigurationReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["slowRefresh"]);
		}
	}

	@validateArgs()
	public async setConfiguration(
		slowRefresh: boolean,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			CentralSceneCommand,
			CentralSceneCommand.ConfigurationSet,
		);

		const cc = new CentralSceneCCConfigurationSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			slowRefresh,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(this: CentralSceneCCAPI, { property }, value) {
			if (property !== "slowRefresh") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof value !== "boolean") {
				throwWrongValueType(
					this.ccId,
					property,
					"boolean",
					typeof value,
				);
			}
			return this.setConfiguration(value);
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: CentralSceneCCAPI, { property }) {
			if (property === "slowRefresh") {
				return (await this.getConfiguration())?.[property];
			}
			throwUnsupportedProperty(this.ccId, property);
		};
	}
}

@commandClass(CommandClasses["Central Scene"])
@implementedVersion(3)
@ccValues(CentralSceneCCValues)
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

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Central Scene"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// If one Association group issues CentralScene notifications,
		// we must associate ourselves with that channel
		try {
			await ccUtils.assignLifelineIssueingCommand(
				ctx,
				endpoint,
				this.ccId,
				CentralSceneCommand.Notification,
			);
		} catch {
			ctx.logNode(node.id, {
				endpoint: endpoint.index,
				message: `Configuring associations to receive ${
					getCCName(
						this.ccId,
					)
				} commands failed!`,
				level: "warn",
			});
		}

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying supported scenes...",
			direction: "outbound",
		});
		const ccSupported = await api.getSupported();
		if (ccSupported) {
			const logMessage = `received supported scenes:
# of scenes:           ${ccSupported.sceneCount}
supports slow refresh: ${ccSupported.supportsSlowRefresh}`;
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported scenes timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// The slow refresh capability should be enabled whenever possible
		if (api.version >= 3 && ccSupported?.supportsSlowRefresh) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "Enabling slow refresh capability...",
				direction: "outbound",
			});
			await api.setConfiguration(true);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}
}

// @publicAPI
export interface CentralSceneCCNotificationOptions {
	sequenceNumber: number;
	keyAttribute: CentralSceneKeys;
	sceneNumber: number;
	slowRefresh?: boolean;
}

@CCCommand(CentralSceneCommand.Notification)
export class CentralSceneCCNotification extends CentralSceneCC {
	public constructor(
		options: WithAddress<CentralSceneCCNotificationOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.sequenceNumber = options.sequenceNumber;
		this.keyAttribute = options.keyAttribute;
		this.sceneNumber = options.sceneNumber;
		this.slowRefresh = options.slowRefresh;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): CentralSceneCCNotification {
		validatePayload(raw.payload.length >= 3);
		const sequenceNumber = raw.payload[0];
		const keyAttribute: CentralSceneKeys = raw.payload[1] & 0b111;
		const sceneNumber = raw.payload[2];
		let slowRefresh: boolean | undefined;
		if (keyAttribute === CentralSceneKeys.KeyHeldDown) {
			// A receiving node MUST ignore this field if the command is not
			// carrying the Key Held Down key attribute.
			slowRefresh = !!(raw.payload[1] & 0b1000_0000);
		}

		return new CentralSceneCCNotification({
			nodeId: ctx.sourceNodeId,
			sequenceNumber,
			keyAttribute,
			sceneNumber,
			slowRefresh,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// In case the interview is not yet completed, we still create some basic metadata
		const sceneValue = CentralSceneCCValues.scene(this.sceneNumber);
		this.ensureMetadata(ctx, sceneValue);

		// The spec behavior is pretty complicated, so we cannot just store
		// the value and call it a day. Handling of these notifications will
		// happen in the receiving node class

		return true;
	}

	public readonly sequenceNumber: number;
	public readonly keyAttribute: CentralSceneKeys;
	public readonly sceneNumber: number;
	public readonly slowRefresh: boolean | undefined;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface CentralSceneCCSupportedReportOptions {
	sceneCount: number;
	supportsSlowRefresh: MaybeNotKnown<boolean>;
	supportedKeyAttributes: Record<number, readonly CentralSceneKeys[]>;
}

@CCCommand(CentralSceneCommand.SupportedReport)
export class CentralSceneCCSupportedReport extends CentralSceneCC {
	public constructor(
		options: WithAddress<CentralSceneCCSupportedReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.sceneCount = options.sceneCount;
		this.supportsSlowRefresh = options.supportsSlowRefresh;
		for (
			const [scene, keys] of Object.entries(
				options.supportedKeyAttributes,
			)
		) {
			this._supportedKeyAttributes.set(
				parseInt(scene),
				keys,
			);
		}
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): CentralSceneCCSupportedReport {
		validatePayload(raw.payload.length >= 2);
		const sceneCount = raw.payload[0];
		const supportsSlowRefresh: MaybeNotKnown<boolean> =
			!!(raw.payload[1] & 0b1000_0000);
		const bitMaskBytes = (raw.payload[1] & 0b110) >>> 1;
		const identicalKeyAttributes = !!(raw.payload[1] & 0b1);
		const numEntries = identicalKeyAttributes ? 1 : sceneCount;
		validatePayload(raw.payload.length >= 2 + bitMaskBytes * numEntries);
		const supportedKeyAttributes: Record<
			number,
			readonly CentralSceneKeys[]
		> = {};
		for (let i = 0; i < numEntries; i++) {
			const mask = raw.payload.subarray(
				2 + i * bitMaskBytes,
				2 + (i + 1) * bitMaskBytes,
			);
			supportedKeyAttributes[i + 1] = parseBitMask(
				mask,
				CentralSceneKeys.KeyPressed,
			);
		}

		if (identicalKeyAttributes) {
			// The key attributes are only transmitted for scene 1, copy them to the others
			for (let i = 2; i <= sceneCount; i++) {
				supportedKeyAttributes[i] = supportedKeyAttributes[1];
			}
		}

		return new CentralSceneCCSupportedReport({
			nodeId: ctx.sourceNodeId,
			sceneCount,
			supportsSlowRefresh,
			supportedKeyAttributes,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Create/extend metadata for all scenes
		for (let i = 1; i <= this.sceneCount; i++) {
			const sceneValue = CentralSceneCCValues.scene(i);
			this.setMetadata(ctx, sceneValue, {
				...sceneValue.meta,
				states: enumValuesToMetadataStates(
					CentralSceneKeys,
					this._supportedKeyAttributes.get(i),
				),
			});
		}

		return true;
	}

	@ccValue(CentralSceneCCValues.sceneCount)
	public readonly sceneCount: number;

	// TODO: Only offer `slowRefresh` if this is true
	@ccValue(CentralSceneCCValues.supportsSlowRefresh)
	public readonly supportsSlowRefresh: MaybeNotKnown<boolean>;

	private _supportedKeyAttributes = new Map<
		number,
		readonly CentralSceneKeys[]
	>();

	@ccValue(CentralSceneCCValues.supportedKeyAttributes)
	public get supportedKeyAttributes(): ReadonlyMap<
		number,
		readonly CentralSceneKeys[]
	> {
		return this._supportedKeyAttributes;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"scene count": this.sceneCount,
			"supports slow refresh": maybeUnknownToString(
				this.supportsSlowRefresh,
			),
		};
		for (const [scene, keys] of this.supportedKeyAttributes) {
			message[`supported attributes (scene #${scene})`] = keys
				.map((k) => `\n· ${getEnumMemberName(CentralSceneKeys, k)}`)
				.join("");
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(CentralSceneCommand.SupportedGet)
@expectedCCResponse(CentralSceneCCSupportedReport)
export class CentralSceneCCSupportedGet extends CentralSceneCC {}

// @publicAPI
export interface CentralSceneCCConfigurationReportOptions {
	slowRefresh: boolean;
}

@CCCommand(CentralSceneCommand.ConfigurationReport)
export class CentralSceneCCConfigurationReport extends CentralSceneCC {
	public constructor(
		options: WithAddress<CentralSceneCCConfigurationReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.slowRefresh = options.slowRefresh;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): CentralSceneCCConfigurationReport {
		validatePayload(raw.payload.length >= 1);
		const slowRefresh = !!(raw.payload[0] & 0b1000_0000);

		return new CentralSceneCCConfigurationReport({
			nodeId: ctx.sourceNodeId,
			slowRefresh,
		});
	}

	@ccValue(CentralSceneCCValues.slowRefresh)
	public readonly slowRefresh: boolean;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "slow refresh": this.slowRefresh },
		};
	}
}

@CCCommand(CentralSceneCommand.ConfigurationGet)
@expectedCCResponse(CentralSceneCCConfigurationReport)
export class CentralSceneCCConfigurationGet extends CentralSceneCC {}

// @publicAPI
export interface CentralSceneCCConfigurationSetOptions {
	slowRefresh: boolean;
}

@CCCommand(CentralSceneCommand.ConfigurationSet)
@useSupervision()
export class CentralSceneCCConfigurationSet extends CentralSceneCC {
	public constructor(
		options: WithAddress<CentralSceneCCConfigurationSetOptions>,
	) {
		super(options);
		this.slowRefresh = options.slowRefresh;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): CentralSceneCCConfigurationSet {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new CentralSceneCCConfigurationSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public slowRefresh: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.slowRefresh ? 0b1000_0000 : 0]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "slow refresh": this.slowRefresh },
		};
	}
}
