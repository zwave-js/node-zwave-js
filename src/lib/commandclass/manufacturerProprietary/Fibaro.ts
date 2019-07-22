import { ZWaveError, ZWaveErrorCodes } from "../../error/ZWaveError";
import { validatePayload } from "../../util/misc";
import { ProprietaryCommand } from "../ManufacturerProprietaryCC";

export class FibaroCC implements ProprietaryCommand {
	public constructor(dataOrOptions?: Buffer | {}) {
		if (Buffer.isBuffer(dataOrOptions)) {
			// Deserialization
			validatePayload(dataOrOptions.length >= 2);
			this.fibaroCCId = dataOrOptions[0];
			if (
				this.fibaroCCId === 0x26 &&
				(new.target as any) !== FibaroVenetianBlindCC
			) {
				return new FibaroVenetianBlindCC(dataOrOptions);
			}
			this.fibaroCCCommand = dataOrOptions[1];
			this.payload = dataOrOptions.slice(2);
		}
	}

	public fibaroCCId!: number;
	public fibaroCCCommand!: number;

	public payload!: Buffer;

	public serialize(): Buffer {
		return Buffer.concat([
			Buffer.from([this.fibaroCCId, this.fibaroCCCommand]),
			this.payload,
		]);
	}
}

export enum FibaroVenetianBlindCCCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export class FibaroVenetianBlindCC extends FibaroCC {
	public constructor(dataOrOptions?: Buffer | {}) {
		super(dataOrOptions);
		this.fibaroCCId = 0x26;

		if (Buffer.isBuffer(dataOrOptions)) {
			if (
				this.fibaroCCCommand === FibaroVenetianBlindCCCommand.Get &&
				(new.target as any) !== FibaroVenetianBlindCCGet
			) {
				return new FibaroVenetianBlindCC(dataOrOptions);
			}
		}
	}

	public fibaroCCCommand!: FibaroVenetianBlindCCCommand;
}

export type FibaroVenetianBlindCCSetOptions =
	| {
			position: number;
	  }
	| {
			tilt: number;
	  };

export class FibaroVenetianBlindCCSet extends FibaroVenetianBlindCC {
	public constructor(
		dataOrOptions: Buffer | FibaroVenetianBlindCCSetOptions,
	) {
		super(dataOrOptions);
		this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Set;

		if (Buffer.isBuffer(dataOrOptions)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if ("position" in dataOrOptions)
				this.position = dataOrOptions.position;
			if ("tilt" in dataOrOptions) this.tilt = dataOrOptions.tilt;
		}
	}

	public position: number | undefined;
	public tilt: number | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			// Is this a bitmap for position and/or tilt?
			this.position != undefined ? 0x02 : 0x01,
			this.position || 0x00,
			this.tilt || 0x00,
		]);
		return super.serialize();
	}
}

export class FibaroVenetianBlindCCGet extends FibaroVenetianBlindCC {
	public constructor(dataOrOptions: Buffer) {
		super(dataOrOptions);
		this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Get;
	}
}

export class FibaroVenetianBlindCCReport extends FibaroVenetianBlindCC {
	public constructor(dataOrOptions: Buffer) {
		super(dataOrOptions);
		this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Report;

		// payload[0] contains a 3
		this.position = this.payload[1];
		this.tilt = this.payload[2];
	}

	public position: number;
	public tilt: number;
}
