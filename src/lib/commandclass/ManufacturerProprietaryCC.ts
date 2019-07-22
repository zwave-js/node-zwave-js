import { IDriver } from "../driver/IDriver";
import { validatePayload } from "../util/misc";
import {
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
import { FibaroCC } from "./manufacturerProprietary/Fibaro";

interface ManufacturerProprietaryOptions extends CCCommandOptions {
	manufacturerId: number;
	proprietaryCommand: Buffer | ProprietaryCommand;
}

@commandClass(CommandClasses["Manufacturer Proprietary"])
@implementedVersion(1)
// TODO: Add a way to specify the expected response
export class ManufacturerProprietaryCC extends CommandClass {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ManufacturerProprietaryOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			// ManufacturerProprietaryCC has no CC command, so the first byte
			// is stored in ccCommand
			const rawPayload = Buffer.concat([
				Buffer.from([super.ccCommand!]),
				this.payload,
			]);

			validatePayload(rawPayload.length >= 2);
			this.manufacturerId = rawPayload.readUInt16BE(0);
			// Try to parse the proprietary command
			const PCConstructor = getProprietaryCommandConstructor(
				this.manufacturerId,
			);
			this.proprietaryCommand = rawPayload.slice(2);
			if (typeof PCConstructor === "function") {
				this.proprietaryCommand = new PCConstructor(
					this.proprietaryCommand,
				);
			}
		} else {
			this.manufacturerId = options.manufacturerId;
			this.proprietaryCommand = options.proprietaryCommand;
		}
	}

	public ccCommand: undefined;
	public manufacturerId: number;
	public proprietaryCommand: Buffer | ProprietaryCommand;

	public serialize(): Buffer {
		const rawPayload = Buffer.concat([
			Buffer.from([
				// Placeholder for manufacturerId
				0x00,
				0x00,
			]),
			this.proprietaryCommand instanceof Buffer
				? this.proprietaryCommand
				: this.proprietaryCommand.serialize(),
		]);
		rawPayload.writeUInt16BE(this.manufacturerId, 0);

		// ManufacturerProprietaryCC has no CC command, so the first byte
		// is stored in ccCommand
		super.ccCommand = rawPayload[0];
		this.payload = rawPayload.slice(1);
		return super.serialize();
	}
}

type ProprietaryCommandConstructor = new (from: Buffer) => ProprietaryCommand;

export interface ProprietaryCommand {
	serialize(): Buffer;
}

function getProprietaryCommandConstructor(
	manufacturerId: number,
): ProprietaryCommandConstructor | undefined {
	switch (manufacturerId) {
		case 0x010f:
			return FibaroCC;
	}
}
