import {
	CommandClasses,
	type MaybeUnknown,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	parseMaybeNumber,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { pick } from "@zwave-js/shared";
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
} from "../../lib/API";
import {
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../../lib/CommandClass";
import { expectedCCResponse } from "../../lib/CommandClassDecorators";
import {
	ManufacturerProprietaryCC,
	ManufacturerProprietaryCCAPI,
} from "../ManufacturerProprietaryCC";
import {
	fibaroCC,
	fibaroCCCommand,
	getFibaroCCCommand,
	getFibaroCCCommandConstructor,
	getFibaroCCConstructor,
	getFibaroCCId,
	manufacturerId,
	manufacturerProprietaryAPI,
} from "./Decorators";

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

export enum FibaroCCIDs {
	VenetianBlind = 0x26,
}

@manufacturerProprietaryAPI(MANUFACTURERID_FIBARO)
export class FibaroCCAPI extends ManufacturerProprietaryCCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async fibaroVenetianBlindsGet() {
		const cc = new FibaroVenetianBlindCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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
		const cc = new FibaroVenetianBlindCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			position: value,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async fibaroVenetianBlindsSetTilt(value: number): Promise<void> {
		const cc = new FibaroVenetianBlindCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			tilt: value,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.fibaroCCId = this.payload[0];
			this.fibaroCCCommand = this.payload[1];

			const FibaroConstructor = getFibaroCCCommandConstructor(
				this.fibaroCCId,
				this.fibaroCCCommand,
			);
			if (
				FibaroConstructor
				&& (new.target as any) !== FibaroConstructor
			) {
				return new FibaroConstructor(host, options);
			}

			this.payload = this.payload.subarray(2);
		} else {
			this.fibaroCCId = getFibaroCCId(this);
			this.fibaroCCCommand = getFibaroCCCommand(this);
		}
	}

	public fibaroCCId?: number;
	public fibaroCCCommand?: number;

	private getSupportedFibaroCCIDs(
		applHost: ZWaveApplicationHost,
	): FibaroCCIDs[] {
		const node = this.getNode(applHost)!;

		const proprietaryConfig = applHost.getDeviceConfig?.(
			node.id,
		)?.proprietary;
		if (proprietaryConfig && isArray(proprietaryConfig.fibaroCCs)) {
			return proprietaryConfig.fibaroCCs as FibaroCCIDs[];
		}

		return [];
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		// Iterate through all supported Fibaro CCs and interview them
		const supportedFibaroCCIDs = this.getSupportedFibaroCCIDs(applHost);
		for (const ccId of supportedFibaroCCIDs) {
			const SubConstructor = getFibaroCCConstructor(ccId);
			if (SubConstructor) {
				const instance = new SubConstructor(this.host, {
					nodeId: node.id,
				});
				await instance.interview(applHost);
			}
		}
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		// Iterate through all supported Fibaro CCs and let them refresh their values
		const supportedFibaroCCIDs = this.getSupportedFibaroCCIDs(applHost);
		for (const ccId of supportedFibaroCCIDs) {
			const SubConstructor = getFibaroCCConstructor(ccId);
			if (SubConstructor) {
				const instance = new SubConstructor(this.host, {
					nodeId: node.id,
				});
				await instance.refreshValues(applHost);
			}
		}
	}

	public serialize(): Buffer {
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
		this.payload = Buffer.concat([
			Buffer.from([this.fibaroCCId, this.fibaroCCCommand]),
			this.payload,
		]);
		return super.serialize();
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(host, options);
		this.fibaroCCId = FibaroCCIDs.VenetianBlind;

		if (gotDeserializationOptions(options)) {
			if (
				this.fibaroCCCommand === FibaroVenetianBlindCCCommand.Report
				&& (new.target as any) !== FibaroVenetianBlindCCReport
			) {
				return new FibaroVenetianBlindCCReport(host, options);
			}
		}
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing Fibaro Venetian Blind CC...`,
			direction: "none",
		});

		// Nothing special, just get the values
		await this.refreshValues(applHost);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			message: "Requesting venetian blind position and tilt...",
			direction: "outbound",
		});
		const resp = await applHost.sendCommand<FibaroVenetianBlindCCReport>(
			new FibaroVenetianBlindCCGet(this.host, {
				nodeId: this.nodeId,
				endpoint: this.endpointIndex,
			}),
		);
		if (resp) {
			const logMessage = `received venetian blind state:
position: ${resp.position}
tilt:     ${resp.tilt}`;
			applHost.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export type FibaroVenetianBlindCCSetOptions =
	& CCCommandOptions
	& (
		| {
			position: number;
		}
		| {
			tilt: number;
		}
		| {
			position: number;
			tilt: number;
		}
	);

@fibaroCCCommand(FibaroVenetianBlindCCCommand.Set)
export class FibaroVenetianBlindCCSet extends FibaroVenetianBlindCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| FibaroVenetianBlindCCSetOptions,
	) {
		super(host, options);
		this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Set;

		if (Buffer.isBuffer(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if ("position" in options) this.position = options.position;
			if ("tilt" in options) this.tilt = options.tilt;
		}
	}

	public position: number | undefined;
	public tilt: number | undefined;

	public serialize(): Buffer {
		const controlByte = (this.position != undefined ? 0b10 : 0)
			| (this.tilt != undefined ? 0b01 : 0);
		this.payload = Buffer.from([
			controlByte,
			this.position ?? 0,
			this.tilt ?? 0,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.position != undefined) {
			message.position = this.position;
		}
		if (this.tilt != undefined) {
			message.tilt = this.tilt;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@fibaroCCCommand(FibaroVenetianBlindCCCommand.Report)
export class FibaroVenetianBlindCCReport extends FibaroVenetianBlindCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Report;

		validatePayload(this.payload.length >= 3);

		// When the node sends a report, payload[0] === 0b11. This is probably a
		// bit mask for position and tilt
		if (!!(this.payload[0] & 0b10)) {
			this._position = parseMaybeNumber(this.payload[1]);
		}
		if (!!(this.payload[0] & 0b01)) {
			this._tilt = parseMaybeNumber(this.payload[2]);
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		const valueDB = this.getValueDB(applHost);

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

	private _position: MaybeUnknown<number> | undefined;
	public get position(): MaybeUnknown<number> | undefined {
		return this._position;
	}

	private _tilt: MaybeUnknown<number> | undefined;
	public get tilt(): MaybeUnknown<number> | undefined {
		return this._tilt;
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.position != undefined) {
			message.position = this.position;
		}
		if (this.tilt != undefined) {
			message.tilt = this.tilt;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@fibaroCCCommand(FibaroVenetianBlindCCCommand.Get)
@expectedCCResponse(FibaroVenetianBlindCCReport)
export class FibaroVenetianBlindCCGet extends FibaroVenetianBlindCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(host, options);
		this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Get;
	}
}
