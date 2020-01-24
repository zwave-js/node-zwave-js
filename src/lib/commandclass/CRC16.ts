import type { Driver } from "../driver/Driver";
import { CRC16_CCITT } from "../util/crc";
import { validatePayload } from "../util/misc";
import type { Maybe } from "../values/Primitive";
import { CCAPI } from "./API";
import { API, CCCommand, CCCommandOptions, CommandClass, commandClass, CommandClassDeserializationOptions, DynamicCCResponse, expectedCCResponse, gotDeserializationOptions, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// @noSetValueAPI
// @noInterview This CC only has a single encapsulation command

// All the supported commands
export enum CRC16Command {
	CommandEncapsulation = 0x01,
}

@API(CommandClasses["CRC-16 Encapsulation"])
export class CRC16CCAPI extends CCAPI {
	public supportsCommand(_cmd: CRC16Command): Maybe<boolean> {
		// switch (cmd) {
		// 	case CRC16Command.CommandEncapsulation:
		return true; // This is mandatory
		// }
		// return super.supportsCommand(cmd);
	}

	public async sendEncapsulated(encapsulatedCC: CommandClass): Promise<void> {
		this.assertSupportsCommand(
			CRC16Command,
			CRC16Command.CommandEncapsulation,
		);

		const cc = new CRC16CCCommandEncapsulation(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			encapsulatedCC,
		});
		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses["CRC-16 Encapsulation"])
@implementedVersion(1)
export class CRC16CC extends CommandClass {
	declare ccCommand: CRC16Command;

	/** Encapsulates a command in a CRC-16 CC */
	public static encapsulate(
		driver: Driver,
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

// This indirection is necessary to be able to define the same CC as the response
const getResponseForCommandEncapsulation: DynamicCCResponse = () =>
	CRC16CCCommandEncapsulation;

@CCCommand(CRC16Command.CommandEncapsulation)
@expectedCCResponse(getResponseForCommandEncapsulation)
export class CRC16CCCommandEncapsulation extends CRC16CC {
	public constructor(
		driver: Driver,
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
