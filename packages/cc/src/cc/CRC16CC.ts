import {
	CRC16_CCITT,
	CommandClasses,
	EncapsulationFlags,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	type CCRaw,
	CommandClass,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";

import { CRC16Command } from "../lib/_Types";

const headerBuffer = Buffer.from([
	CommandClasses["CRC-16 Encapsulation"],
	CRC16Command.CommandEncapsulation,
]);

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

		const cc = new CRC16CCCommandEncapsulation({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			encapsulated: encapsulatedCC,
		});
		await this.host.sendCommand(cc, this.commandOptions);
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
		cc: CommandClass,
	): CRC16CCCommandEncapsulation {
		const ret = new CRC16CCCommandEncapsulation({
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
export interface CRC16CCCommandEncapsulationOptions {
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
		options: CRC16CCCommandEncapsulationOptions & CCCommandOptions,
	) {
		super(options);
		this.encapsulated = options.encapsulated;
		this.encapsulated.encapsulatingCC = this as any;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): CRC16CCCommandEncapsulation {
		validatePayload(raw.payload.length >= 3);

		const ccBuffer = raw.payload.subarray(0, -2);

		// Verify the CRC
		let expectedCRC = CRC16_CCITT(headerBuffer);
		expectedCRC = CRC16_CCITT(ccBuffer, expectedCRC);
		const actualCRC = raw.payload.readUInt16BE(
			raw.payload.length - 2,
		);
		validatePayload(expectedCRC === actualCRC);

		const encapsulated = CommandClass.parse(ccBuffer, ctx);
		return new CRC16CCCommandEncapsulation({
			nodeId: ctx.sourceNodeId,
			encapsulated,
		});
	}

	public encapsulated: CommandClass;

	public serialize(ctx: CCEncodingContext): Buffer {
		const commandBuffer = this.encapsulated.serialize(ctx);
		// Reserve 2 bytes for the CRC
		this.payload = Buffer.concat([commandBuffer, Buffer.allocUnsafe(2)]);

		// Compute and save the CRC16 in the payload
		// The CC header is included in the CRC computation
		let crc = CRC16_CCITT(headerBuffer);
		crc = CRC16_CCITT(commandBuffer, crc);
		this.payload.writeUInt16BE(crc, this.payload.length - 2);

		return super.serialize(ctx);
	}

	protected computeEncapsulationOverhead(): number {
		// CRC16 adds two bytes CRC to the default overhead
		return super.computeEncapsulationOverhead() + 2;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			// Hide the default payload line
			message: undefined,
		};
	}
}
