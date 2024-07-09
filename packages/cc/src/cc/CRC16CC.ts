import {
	CRC16_CCITT,
	CommandClasses,
	EncapsulationFlags,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	validatePayload,
} from "@zwave-js/core/safe";
import type { ZWaveHost, ZWaveValueHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { CRC16Command } from "../lib/_Types";

// @noSetValueAPI
// @noInterview This CC only has a single encapsulation command

// Encapsulation CCs are used internally and too frequently that we
// want to pay the cost of validating each call
/* eslint-disable @zwave-js/ccapi-validate-args */

@API(CommandClasses["CRC-16 Encapsulation"])
export class CRC16CCAPI extends CCAPI {
	public supportsCommand(_cmd: CRC16Command): MaybeNotKnown<boolean> {
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

		const cc = new CRC16CCCommandEncapsulation(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			encapsulated: encapsulatedCC,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["CRC-16 Encapsulation"])
@implementedVersion(1)
export class CRC16CC extends CommandClass {
	declare ccCommand: CRC16Command;

	/** Tests if a command should be supervised and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		return (
			!!(cc.encapsulationFlags & EncapsulationFlags.CRC16)
			&& !(cc instanceof CRC16CCCommandEncapsulation)
		);
	}

	/** Encapsulates a command in a CRC-16 CC */
	public static encapsulate(
		host: ZWaveHost,
		cc: CommandClass,
	): CRC16CCCommandEncapsulation {
		const ret = new CRC16CCCommandEncapsulation(host, {
			nodeId: cc.nodeId,
			encapsulated: cc,
		});

		// Copy the encapsulation flags from the encapsulated command
		// but omit CRC-16, since we're doing that right now
		ret.encapsulationFlags = cc.encapsulationFlags
			& ~EncapsulationFlags.CRC16;

		return ret;
	}
}

// @publicAPI
export interface CRC16CCCommandEncapsulationOptions extends CCCommandOptions {
	encapsulated: CommandClass;
}

function getCCResponseForCommandEncapsulation(
	sent: CRC16CCCommandEncapsulation,
) {
	if (sent.encapsulated?.expectsCCResponse()) {
		return CRC16CCCommandEncapsulation;
	}
}

@CCCommand(CRC16Command.CommandEncapsulation)
@expectedCCResponse(
	getCCResponseForCommandEncapsulation,
	() => "checkEncapsulated",
)
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

			const ccBuffer = this.payload.subarray(0, -2);

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
				origin: options.origin,
				frameType: options.frameType,
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			// Hide the default payload line
			message: undefined,
		};
	}
}
