import { isArray } from "alcalzone-shared/typeguards";
import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { validatePayload } from "../util/misc";
import { CCAPI } from "./API";
import { API, CCCommandOptions, CommandClass, commandClass, CommandClassDeserializationOptions, gotDeserializationOptions, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
import { MANUFACTURERID_FIBARO } from "./manufacturerProprietary/Constants";
import { getManufacturerIdValueId } from "./ManufacturerSpecificCC";

@API(CommandClasses["Manufacturer Proprietary"])
export class ManufacturerProprietaryCCAPI extends CCAPI {
	public async sendData(
		manufacturerId: number,
		data?: Buffer,
	): Promise<void> {
		const cc = new ManufacturerProprietaryCC(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		cc.manufacturerId = manufacturerId;
		cc.payload = data ?? Buffer.allocUnsafe(0);

		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses["Manufacturer Proprietary"])
@implementedVersion(1)
// TODO: Add a way to specify the expected response
export class ManufacturerProprietaryCC extends CommandClass {
	declare ccCommand: undefined;

	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			// ManufacturerProprietaryCC has no CC command, so the first byte is stored in ccCommand.
			this.manufacturerId = (super.ccCommand! << 8) + this.payload[0];
			// If this is not called from a subclass, shorten the payload for the following subclass deserialization
			if (new.target === ManufacturerProprietaryCC) {
				this.payload = this.payload.slice(1);
			}

			// Try to parse the proprietary command
			const PCConstructor = getProprietaryCCConstructor(
				this.manufacturerId,
			);
			if (PCConstructor && new.target !== PCConstructor) {
				return new PCConstructor(driver, options);
			}
		} else {
			this.manufacturerId = this.getValueDB().getValue<number>(
				getManufacturerIdValueId(),
			)!;
			// To use this CC, a manufacturer ID must exist in the value DB
			// If it doesn't, the interview procedure will throw.
		}
	}

	// This must be set in subclasses
	public manufacturerId!: number;

	private assertManufacturerIdIsSet(): void {
		// wotan-disable-next-line
		if (this.manufacturerId == undefined) {
			throw new ZWaveError(
				`To use an instance of ManufacturerProprietaryCC, the manufacturer ID must be stored in the value DB`,
				ZWaveErrorCodes.ManufacturerProprietaryCC_NoManufacturerId,
			);
		}
	}

	public serialize(): Buffer {
		this.assertManufacturerIdIsSet();
		// ManufacturerProprietaryCC has no CC command, so the first byte
		// is stored in ccCommand
		super.ccCommand = (this.manufacturerId >>> 8) & 0xff;
		// The 2nd byte is in the payload
		this.payload = Buffer.concat([
			Buffer.from([
				// 2nd byte of manufacturerId
				this.manufacturerId & 0xff,
			]),
			this.payload,
		]);
		return super.serialize();
	}

	public async interview(complete: boolean = true): Promise<void> {
		this.assertManufacturerIdIsSet();

		const node = this.getNode()!;
		// TODO: Can this be refactored?
		const proprietaryConfig = node.deviceConfig?.proprietary;
		if (
			this.manufacturerId === 0x010f /* Fibaro */ &&
			proprietaryConfig &&
			isArray(proprietaryConfig.fibaroCCs) &&
			proprietaryConfig.fibaroCCs.includes(0x26 /* Venetian Blinds */)
		) {
			const FibaroVenetianBlindCC = require("./manufacturerProprietary/Fibaro")
				.FibaroVenetianBlindCC;
			return new FibaroVenetianBlindCC(this.driver, {
				nodeId: this.nodeId,
				endpoint: this.endpointIndex,
			}).interview(complete);
		} else {
			log.controller.logNode(node.id, {
				message: `${this.constructor.name}: skipping interview because none of the implemented proprietary CCs are supported...`,
				direction: "none",
			});
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

function getProprietaryCCConstructor(
	manufacturerId: number,
): typeof ManufacturerProprietaryCC | undefined {
	switch (manufacturerId) {
		case MANUFACTURERID_FIBARO:
			return require("./manufacturerProprietary/Fibaro").FibaroCC;
	}
}
