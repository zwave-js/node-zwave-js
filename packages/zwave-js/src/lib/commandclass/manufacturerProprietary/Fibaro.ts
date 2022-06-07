import {
	CommandClasses,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	parseMaybeNumber,
	unknownNumber,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { staticExtends } from "@zwave-js/shared";
import type { Driver } from "../../driver/Driver";
import {
	CCCommandOptions,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
} from "../CommandClass";
import { ManufacturerProprietaryCC } from "../ManufacturerProprietaryCC";
import { MANUFACTURERID_FIBARO } from "./Constants";

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

export class FibaroCC extends ManufacturerProprietaryCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		if (gotDeserializationOptions(options)) {
			super(host, options);
			validatePayload(this.payload.length >= 2);
			this.fibaroCCId = this.payload[0];
			this.fibaroCCCommand = this.payload[1];
			this.payload = this.payload.slice(2);

			if (
				this.fibaroCCId === FibaroCCIDs.VenetianBlind &&
				!staticExtends(new.target, FibaroVenetianBlindCC)
			) {
				return new FibaroVenetianBlindCC(host, options);
			}
		} else {
			super(host, { ...options, manufacturerId: MANUFACTURERID_FIBARO });
		}
	}

	public fibaroCCId!: number; // This is either deserialized or set by a subclass
	public fibaroCCCommand!: number;

	public serialize(): Buffer {
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

export class FibaroVenetianBlindCC extends FibaroCC {
	declare fibaroCCCommand: FibaroVenetianBlindCCCommand;

	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(host, options);
		this.fibaroCCId = FibaroCCIDs.VenetianBlind;

		if (gotDeserializationOptions(options)) {
			if (
				this.fibaroCCCommand === FibaroVenetianBlindCCCommand.Report &&
				(new.target as any) !== FibaroVenetianBlindCCReport
			) {
				return new FibaroVenetianBlindCCReport(host, options);
			}
		}
	}

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(driver);

		// Remember that the interview is complete
		this.setInterviewComplete(driver, true);
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;

		driver.controllerLog.logNode(node.id, {
			message: "Requesting venetian blind position and tilt...",
			direction: "outbound",
		});
		const resp = await driver.sendCommand<FibaroVenetianBlindCCReport>(
			new FibaroVenetianBlindCCGet(this.host, {
				nodeId: this.nodeId,
				endpoint: this.endpointIndex,
			}),
		);
		if (resp) {
			const logMessage = `received venetian blind state:
position: ${resp.position}
tilt:     ${resp.tilt}`;
			driver.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

export type FibaroVenetianBlindCCSetOptions = CCCommandOptions &
	(
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
		const controlByte =
			(this.position != undefined ? 0b10 : 0) |
			(this.tilt != undefined ? 0b01 : 0);
		this.payload = Buffer.from([
			controlByte,
			this.position ?? 0,
			this.tilt ?? 0,
		]);
		return super.serialize();
	}

	public toLogEntry(driver: Driver): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.position != undefined) {
			message.position = this.position;
		}
		if (this.tilt != undefined) {
			message.tilt = this.tilt;
		}
		return {
			...super.toLogEntry(driver),
			message,
		};
	}
}

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
		if (
			this._position === unknownNumber &&
			!applHost.options.preserveUnknownValues
		) {
			this._position = undefined;
		}
		if (
			this._tilt === unknownNumber &&
			!applHost.options.preserveUnknownValues
		) {
			this._tilt = undefined;
		}

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

	private _position: Maybe<number> | undefined;
	public get position(): Maybe<number> | undefined {
		return this._position;
	}

	private _tilt: Maybe<number> | undefined;
	public get tilt(): Maybe<number> | undefined {
		return this._tilt;
	}

	public toLogEntry(driver: Driver): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.position != undefined) {
			message.position = this.position;
		}
		if (this.tilt != undefined) {
			message.tilt = this.tilt;
		}
		return {
			...super.toLogEntry(driver),
			message,
		};
	}
}

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
