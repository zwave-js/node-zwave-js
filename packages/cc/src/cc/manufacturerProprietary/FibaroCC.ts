import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import { type GetDeviceConfig } from "@zwave-js/config";
import {
	CommandClasses,
	type GetValueDB,
	type MaybeUnknown,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type ValueID,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	parseMaybeNumber,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import { isArray } from "alcalzone-shared/typeguards";
import {
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../../lib/API.js";
import {
	type CCRaw,
	type CommandClassOptions,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
} from "../../lib/CommandClass.js";
import { expectedCCResponse } from "../../lib/CommandClassDecorators.js";
import {
	ManufacturerProprietaryCC,
	ManufacturerProprietaryCCAPI,
} from "../ManufacturerProprietaryCC.js";
import {
	fibaroCC,
	fibaroCCCommand,
	getFibaroCCCommand,
	getFibaroCCCommandConstructor,
	getFibaroCCConstructor,
	getFibaroCCId,
	manufacturerId,
	manufacturerProprietaryAPI,
} from "./Decorators.js";

export const MANUFACTURERID_FIBARO = 0x10f;

/** Returns the ValueID used to store the current venetian blind position */
export function getFibaroVenetianBlindPositionValueId(
	endpoint: number,
): ValueID {
	return {
		commandClass: CommandClasses["Manufacturer Proprietary"],
		endpoint,
		property: "fibaro",
		propertyKey: "venetianBlindsPosition",
	};
}

/** Returns the value metadata for venetian blind position */
export function getFibaroVenetianBlindPositionMetadata(): ValueMetadata {
	return {
		...ValueMetadata.Level,
		label: "Venetian blinds position",
	};
}

/** Returns the ValueID used to store the current venetian blind tilt */
export function getFibaroVenetianBlindTiltValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Manufacturer Proprietary"],
		endpoint,
		property: "fibaro",
		propertyKey: "venetianBlindsTilt",
	};
}

/** Returns the value metadata for venetian blind tilt */
export function getFibaroVenetianBlindTiltMetadata(): ValueMetadata {
	return {
		...ValueMetadata.Level,
		label: "Venetian blinds tilt",
	};
}

function getSupportedFibaroCCIDs(
	ctx: GetDeviceConfig,
	nodeId: number,
): FibaroCCIDs[] {
	const proprietaryConfig = ctx.getDeviceConfig?.(
		nodeId,
	)?.proprietary;
	if (proprietaryConfig && isArray(proprietaryConfig.fibaroCCs)) {
		return proprietaryConfig.fibaroCCs as FibaroCCIDs[];
	}

	return [];
}

export enum FibaroCCIDs {
	VenetianBlind = 0x26,
}

@manufacturerProprietaryAPI(MANUFACTURERID_FIBARO)
export class FibaroCCAPI extends ManufacturerProprietaryCCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async fibaroVenetianBlindsGet() {
		const cc = new FibaroVenetianBlindCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			FibaroVenetianBlindCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["position", "tilt"]);
		}
	}

	@validateArgs()
	public async fibaroVenetianBlindsSetPosition(value: number): Promise<void> {
		const cc = new FibaroVenetianBlindCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			position: value,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async fibaroVenetianBlindsSetTilt(value: number): Promise<void> {
		const cc = new FibaroVenetianBlindCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			tilt: value,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: FibaroCCAPI,
			{ property, propertyKey },
			value,
		) {
			if (property !== "fibaro") {
				throwUnsupportedProperty(this.ccId, property);
			}

			if (propertyKey === "venetianBlindsPosition") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				await this.fibaroVenetianBlindsSetPosition(value);
			} else if (propertyKey === "venetianBlindsTilt") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				await this.fibaroVenetianBlindsSetTilt(value);
			} else {
				// unsupported property key, ignore...
				return;
			}

			// Verify the current value after a delay
			this.schedulePoll({ property, propertyKey }, value);

			return undefined;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: FibaroCCAPI, { property, propertyKey }) {
			if (property !== "fibaro") {
				throwUnsupportedProperty(this.ccId, property);
			} else if (propertyKey == undefined) {
				throwMissingPropertyKey(this.ccId, property);
			}

			switch (propertyKey) {
				case "venetianBlindsPosition":
					return (await this.fibaroVenetianBlindsGet())?.position;
				case "venetianBlindsTilt":
					return (await this.fibaroVenetianBlindsGet())?.tilt;
				default:
					throwUnsupportedPropertyKey(
						this.ccId,
						property,
						propertyKey,
					);
			}
		};
	}
}

@manufacturerId(MANUFACTURERID_FIBARO)
export class FibaroCC extends ManufacturerProprietaryCC {
	public constructor(
		options: CommandClassOptions,
	) {
		super(options);

		this.fibaroCCId = getFibaroCCId(this);
		this.fibaroCCCommand = getFibaroCCCommand(this);
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): FibaroCC {
		validatePayload(raw.payload.length >= 2);
		const fibaroCCId = raw.payload[0];
		const fibaroCCCommand = raw.payload[1];

		const FibaroConstructor = getFibaroCCCommandConstructor(
			fibaroCCId,
			fibaroCCCommand,
		);
		if (FibaroConstructor) {
			return FibaroConstructor.from(
				raw.withPayload(raw.payload.subarray(2)),
				ctx,
			);
		}

		return new FibaroCC({
			nodeId: ctx.sourceNodeId,
		});
	}

	public fibaroCCId?: number;
	public fibaroCCCommand?: number;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		// Iterate through all supported Fibaro CCs and interview them
		const supportedFibaroCCIDs = getSupportedFibaroCCIDs(ctx, node.id);
		for (const ccId of supportedFibaroCCIDs) {
			const SubConstructor = getFibaroCCConstructor(ccId);
			if (SubConstructor) {
				const instance = new SubConstructor({ nodeId: node.id });
				await instance.interview(ctx);
			}
		}
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		// Iterate through all supported Fibaro CCs and let them refresh their values
		const supportedFibaroCCIDs = getSupportedFibaroCCIDs(ctx, node.id);
		for (const ccId of supportedFibaroCCIDs) {
			const SubConstructor = getFibaroCCConstructor(ccId);
			if (SubConstructor) {
				const instance = new SubConstructor({ nodeId: node.id });
				await instance.refreshValues(ctx);
			}
		}
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		if (this.fibaroCCId == undefined) {
			throw new ZWaveError(
				"Cannot serialize a Fibaro CC without a Fibaro CC ID",
				ZWaveErrorCodes.CC_Invalid,
			);
		} else if (this.fibaroCCCommand == undefined) {
			throw new ZWaveError(
				"Cannot serialize a Fibaro CC without a Fibaro CC Command",
				ZWaveErrorCodes.CC_Invalid,
			);
		}
		this.payload = Bytes.concat([
			Bytes.from([this.fibaroCCId, this.fibaroCCCommand]),
			this.payload,
		]);
		return super.serialize(ctx);
	}
}

export enum FibaroVenetianBlindCCCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@fibaroCC(FibaroCCIDs.VenetianBlind)
export class FibaroVenetianBlindCC extends FibaroCC {
	declare fibaroCCId: FibaroCCIDs.VenetianBlind;
	declare fibaroCCCommand: FibaroVenetianBlindCCCommand;

	public constructor(
		options: CommandClassOptions,
	) {
		super(options);
		this.fibaroCCId = FibaroCCIDs.VenetianBlind;
	}

	public async interview(ctx: InterviewContext): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing Fibaro Venetian Blind CC...`,
			direction: "none",
		});

		// Nothing special, just get the values
		await this.refreshValues(ctx);
	}

	public async refreshValues(ctx: RefreshValuesContext): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			message: "Requesting venetian blind position and tilt...",
			direction: "outbound",
		});
		const resp = await ctx.sendCommand<FibaroVenetianBlindCCReport>(
			new FibaroVenetianBlindCCGet({
				nodeId: this.nodeId,
				endpointIndex: this.endpointIndex,
			}),
		);
		if (resp) {
			const logMessage = `received venetian blind state:
position: ${resp.position}
tilt:     ${resp.tilt}`;
			ctx.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export type FibaroVenetianBlindCCSetOptions =
	| {
		position: number;
	}
	| {
		tilt: number;
	}
	| {
		position: number;
		tilt: number;
	};

@fibaroCCCommand(FibaroVenetianBlindCCCommand.Set)
export class FibaroVenetianBlindCCSet extends FibaroVenetianBlindCC {
	public constructor(
		options: WithAddress<FibaroVenetianBlindCCSetOptions>,
	) {
		super(options);
		this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Set;

		if ("position" in options) this.position = options.position;
		if ("tilt" in options) this.tilt = options.tilt;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): FibaroVenetianBlindCCSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);
	}

	public position: number | undefined;
	public tilt: number | undefined;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const controlByte = (this.position != undefined ? 0b10 : 0)
			| (this.tilt != undefined ? 0b01 : 0);
		this.payload = Bytes.from([
			controlByte,
			this.position ?? 0,
			this.tilt ?? 0,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.position != undefined) {
			message.position = this.position;
		}
		if (this.tilt != undefined) {
			message.tilt = this.tilt;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface FibaroVenetianBlindCCReportOptions {
	position?: MaybeUnknown<number>;
	tilt?: MaybeUnknown<number>;
}

@fibaroCCCommand(FibaroVenetianBlindCCCommand.Report)
export class FibaroVenetianBlindCCReport extends FibaroVenetianBlindCC {
	public constructor(
		options: WithAddress<FibaroVenetianBlindCCReportOptions>,
	) {
		super(options);
		this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Report;

		// TODO: Check implementation:
		this.position = options.position;
		this.tilt = options.tilt;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FibaroVenetianBlindCCReport {
		validatePayload(raw.payload.length >= 3);
		// When the node sends a report, payload[0] === 0b11. This is probably a
		// bit mask for position and tilt
		let position: MaybeUnknown<number> | undefined;
		if (!!(raw.payload[0] & 0b10)) {
			position = parseMaybeNumber(raw.payload[1]);
		}

		let tilt: MaybeUnknown<number> | undefined;
		if (!!(raw.payload[0] & 0b01)) {
			tilt = parseMaybeNumber(raw.payload[2]);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			position,
			tilt,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;
		const valueDB = this.getValueDB(ctx);

		if (this.position != undefined) {
			const positionValueId = getFibaroVenetianBlindPositionValueId(
				this.endpointIndex,
			);
			valueDB.setMetadata(positionValueId, {
				...ValueMetadata.Level,
				label: "Venetian blinds position",
			});
			valueDB.setValue(positionValueId, this.position);
		}
		if (this.tilt != undefined) {
			const tiltValueId = getFibaroVenetianBlindTiltValueId(
				this.endpointIndex,
			);
			valueDB.setMetadata(tiltValueId, {
				...ValueMetadata.Level,
				label: "Venetian blinds tilt",
			});
			valueDB.setValue(tiltValueId, this.tilt);
		}

		return true;
	}

	public position: MaybeUnknown<number> | undefined;
	public tilt: MaybeUnknown<number> | undefined;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.position != undefined) {
			message.position = this.position;
		}
		if (this.tilt != undefined) {
			message.tilt = this.tilt;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@fibaroCCCommand(FibaroVenetianBlindCCCommand.Get)
@expectedCCResponse(FibaroVenetianBlindCCReport)
export class FibaroVenetianBlindCCGet extends FibaroVenetianBlindCC {
	public constructor(
		options: CommandClassOptions,
	) {
		super(options);
		this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Get;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FibaroVenetianBlindCCGet {
		return new this({
			nodeId: ctx.sourceNodeId,
		});
	}
}
