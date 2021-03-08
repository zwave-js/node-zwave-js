import {
	CommandClasses,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { pick, staticExtends } from "@zwave-js/shared";
import { isArray } from "alcalzone-shared/typeguards";
import type { Driver } from "../driver/Driver";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import {
	API,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { MANUFACTURERID_FIBARO } from "./manufacturerProprietary/Constants";
import type { FibaroVenetianBlindCCReport } from "./manufacturerProprietary/Fibaro";
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

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async fibaroVenetianBlindsGet() {
		const {
			FibaroVenetianBlindCCGet,
			// eslint-disable-next-line @typescript-eslint/no-var-requires
		} = require("./manufacturerProprietary/Fibaro") as typeof import("./manufacturerProprietary/Fibaro");
		const cc = new FibaroVenetianBlindCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<FibaroVenetianBlindCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["position", "tilt"]);
		}
	}

	public async fibaroVenetianBlindsSetPosition(value: number): Promise<void> {
		const {
			FibaroVenetianBlindCCSet,
			// eslint-disable-next-line @typescript-eslint/no-var-requires
		} = require("./manufacturerProprietary/Fibaro") as typeof import("./manufacturerProprietary/Fibaro");
		const cc = new FibaroVenetianBlindCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			position: value,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async fibaroVenetianBlindsSetTilt(value: number): Promise<void> {
		const {
			FibaroVenetianBlindCCSet,
			// eslint-disable-next-line @typescript-eslint/no-var-requires
		} = require("./manufacturerProprietary/Fibaro") as typeof import("./manufacturerProprietary/Fibaro");
		const cc = new FibaroVenetianBlindCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			tilt: value,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	): Promise<void> => {
		// TODO: This is pretty hardcoded, can we make this more flexible?
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
		this.schedulePoll({ property });
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "position":
			case "tilt":
				return (await this.fibaroVenetianBlindsGet())?.[property];
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};
}

@commandClass(CommandClasses["Manufacturer Proprietary"])
@implementedVersion(1)
// TODO: Add a way to specify the expected response
export class ManufacturerProprietaryCC extends CommandClass {
	declare ccCommand: undefined;
	// @noCCValues

	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			// ManufacturerProprietaryCC has no CC command, so the first byte is stored in ccCommand.
			this.manufacturerId =
				(((this.ccCommand as unknown) as number) << 8) +
				this.payload[0];
			this.payload = this.payload.slice(1);

			// Try to parse the proprietary command
			const PCConstructor = getProprietaryCCConstructor(
				this.manufacturerId,
			);
			if (
				PCConstructor &&
				new.target !== PCConstructor &&
				!staticExtends(new.target, PCConstructor)
			) {
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

	public async interview(): Promise<void> {
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
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const FibaroVenetianBlindCC = (require("./manufacturerProprietary/Fibaro") as typeof import("./manufacturerProprietary/Fibaro"))
				.FibaroVenetianBlindCC;
			await new FibaroVenetianBlindCC(this.driver, {
				nodeId: this.nodeId,
				endpoint: this.endpointIndex,
			}).interview();
		} else {
			this.driver.controllerLog.logNode(node.id, {
				message: `${this.constructor.name}: skipping interview because none of the implemented proprietary CCs are supported...`,
				direction: "none",
			});
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
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
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const FibaroVenetianBlindCC = (require("./manufacturerProprietary/Fibaro") as typeof import("./manufacturerProprietary/Fibaro"))
				.FibaroVenetianBlindCC;
			await new FibaroVenetianBlindCC(this.driver, {
				nodeId: this.nodeId,
				endpoint: this.endpointIndex,
			}).refreshValues();
		} else {
			this.driver.controllerLog.logNode(node.id, {
				message: `${this.constructor.name}: skipping interview because none of the implemented proprietary CCs are supported...`,
				direction: "none",
			});
		}
	}
}

function getProprietaryCCConstructor(
	manufacturerId: number,
): typeof ManufacturerProprietaryCC | undefined {
	switch (manufacturerId) {
		case MANUFACTURERID_FIBARO:
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			return require("./manufacturerProprietary/Fibaro").FibaroCC;
	}
}
