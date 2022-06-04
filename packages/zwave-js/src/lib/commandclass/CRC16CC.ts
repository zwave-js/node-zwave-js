import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core";
import { CommandClasses, CRC16_CCITT, validatePayload } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CRC16Command } from "./_Types";

// @noSetValueAPI
// @noInterview This CC only has a single encapsulation command

// @noValidateArgs - Encapsulation CCs are used internally and too frequently that we
// want to pay the cost of validating each call
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
			encapsulated: encapsulatedCC,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["CRC-16 Encapsulation"])
@implementedVersion(1)
export class CRC16CC extends CommandClass {
	declare ccCommand: CRC16Command;

	/** Encapsulates a command in a CRC-16 CC */
	public static encapsulate(
		host: ZWaveHost,
		cc: CommandClass,
	): CRC16CCCommandEncapsulation {
		return new CRC16CCCommandEncapsulation(host, {
			nodeId: cc.nodeId,
			encapsulated: cc,
		});
	}
}

interface CRC16CCCommandEncapsulationOptions extends CCCommandOptions {
	encapsulated: CommandClass;
}

// This indirection is necessary to be able to define the same CC as the response
function getResponseForCommandEncapsulation() {
	return CRC16CCCommandEncapsulation;
}

@CCCommand(CRC16Command.CommandEncapsulation)
@expectedCCResponse(getResponseForCommandEncapsulation)
export class CRC16CCCommandEncapsulation extends CRC16CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| CRC16CCCommandEncapsulationOptions,
	) {
		super(host, options);
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

			this.encapsulated = CommandClass.from(this.host, {
				data: ccBuffer,
				fromEncapsulation: true,
				encapCC: this,
			});
		} else {
			this.encapsulated = options.encapsulated;
			options.encapsulated.encapsulatingCC = this as any;
		}
	}

	public encapsulated: CommandClass;
	private readonly headerBuffer = Buffer.from([this.ccId, this.ccCommand]);

	public serialize(): Buffer {
		const commandBuffer = this.encapsulated.serialize();
		// Reserve 2 bytes for the CRC
		this.payload = Buffer.concat([commandBuffer, Buffer.allocUnsafe(2)]);

		// Compute and save the CRC16 in the payload
		// The CC header is included in the CRC computation
		let crc = CRC16_CCITT(this.headerBuffer);
		crc = CRC16_CCITT(commandBuffer, crc);
		this.payload.writeUInt16BE(crc, this.payload.length - 2);

		return super.serialize();
	}

	protected computeEncapsulationOverhead(): number {
		// CRC16 adds two bytes CRC to the default overhead
		return super.computeEncapsulationOverhead() + 2;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			// Hide the default payload line
			message: undefined,
		};
	}
}
