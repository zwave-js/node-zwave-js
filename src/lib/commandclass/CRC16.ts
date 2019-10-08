import { IDriver } from "../driver/IDriver";
import { CRC16_CCITT } from "../util/crc";
import { validatePayload } from "../util/misc";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// @noSetValueAPI

// All the supported commands
export enum CRC16Command {
	CommandEncapsulation = 0x01,
}

export interface CRC16CC {
	ccCommand: CRC16Command;
}

@commandClass(CommandClasses["CRC-16 Encapsulation"])
@implementedVersion(1)
export class CRC16CC extends CommandClass {
	/** Encapsulates a command in a CRC-16 CC */
	public static encapsulate(
		driver: IDriver,
		cc: CommandClass,
	): CRC16CCCommandEncapsulation {
		return new CRC16CCCommandEncapsulation(driver, {
			nodeId: cc.nodeId,
			encapsulatedCC: cc,
		});
	}

	/** Unwraps a CRC-16 encapsulated command */
	public static unwrap(cc: CRC16CCCommandEncapsulation): CommandClass {
		return cc;
	}
}

interface CRC16CCCommandEncapsulationOptions extends CCCommandOptions {
	encapsulatedCC: CommandClass;
}

@CCCommand(CRC16Command.CommandEncapsulation)
// TODO: Infer the expected response from the encapsulated CC
export class CRC16CCCommandEncapsulation extends CRC16CC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| CRC16CCCommandEncapsulationOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);

			const ccBuffer = this.payload.slice(0, -2);

			// Verify the CRC
			let expectedCRC = CRC16_CCITT(this.headerBuffer);
			expectedCRC = CRC16_CCITT(ccBuffer, expectedCRC);
			const actualCRC = this.payload.readUInt16BE(
				this.payload.length - 2,
			);
			validatePayload(expectedCRC === actualCRC);

			this.encapsulatedCC = CommandClass.fromEncapsulated(
				this.driver,
				this,
				ccBuffer,
			);
		} else {
			this.encapsulatedCC = options.encapsulatedCC;
		}
	}

	public encapsulatedCC: CommandClass;
	private readonly headerBuffer = Buffer.from([this.ccId, this.ccCommand]);

	public serialize(): Buffer {
		// The CC header is included in the CRC computation
		const commandBuffer = this.encapsulatedCC.serializeForEncapsulation();
		// Reserve 2 bytes for the CRC
		this.payload = Buffer.concat([commandBuffer, Buffer.allocUnsafe(2)]);

		// Compute and save the CRC16 in the payload
		let crc = CRC16_CCITT(this.headerBuffer);
		crc = CRC16_CCITT(commandBuffer, crc);
		this.payload.writeUInt16BE(crc, this.payload.length - 2);

		return super.serialize();
	}
}
