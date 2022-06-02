/* eslint-disable @typescript-eslint/no-var-requires */
import {
	CommandClasses,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { pick, staticExtends } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import { isArray } from "alcalzone-shared/typeguards";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	API,
	commandClass,
	CommandClass,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	FibaroVenetianBlindCCReport,
	MANUFACTURERID_FIBARO,
} from "./manufacturerProprietary/FibaroCC";
import { getManufacturerIdValueId } from "./ManufacturerSpecificCC";

@API(CommandClasses["Manufacturer Proprietary"])
export class ManufacturerProprietaryCCAPI extends CCAPI {
	@validateArgs()
	public async sendData(
		manufacturerId: number,
		data?: Buffer,
	): Promise<void> {
		const cc = new ManufacturerProprietaryCC(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			manufacturerId,
		});
		cc.payload = data ?? Buffer.allocUnsafe(0);

		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async sendAndReceiveData(manufacturerId: number, data?: Buffer) {
		const cc = new ManufacturerProprietaryCC(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			manufacturerId,
			expectsResponse: true,
		});
		cc.payload = data ?? Buffer.allocUnsafe(0);

		const response =
			await this.applHost.sendCommand<ManufacturerProprietaryCC>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return {
				manufacturerId: response.manufacturerId,
				data: response.payload,
			};
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async fibaroVenetianBlindsGet() {
		const { FibaroVenetianBlindCCGet } =
			require("./manufacturerProprietary/FibaroCC") as typeof import("./manufacturerProprietary/FibaroCC");
		const cc = new FibaroVenetianBlindCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<FibaroVenetianBlindCCReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, ["position", "tilt"]);
		}
	}

	@validateArgs()
	public async fibaroVenetianBlindsSetPosition(value: number): Promise<void> {
		const { FibaroVenetianBlindCCSet } =
			require("./manufacturerProprietary/FibaroCC") as typeof import("./manufacturerProprietary/FibaroCC");
		const cc = new FibaroVenetianBlindCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			position: value,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async fibaroVenetianBlindsSetTilt(value: number): Promise<void> {
		const { FibaroVenetianBlindCCSet } =
			require("./manufacturerProprietary/FibaroCC") as typeof import("./manufacturerProprietary/FibaroCC");
		const cc = new FibaroVenetianBlindCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			tilt: value,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	): Promise<void> => {
		// TODO: This is pretty hardcoded, can we make this more flexible?
		if (property !== "FibaroCC") {
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
		this.schedulePoll({ property, propertyKey }, value);
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
		propertyKey,
	}): Promise<unknown> => {
		if (property !== "FibaroCC") {
			throwUnsupportedProperty(this.ccId, property);
		} else if (propertyKey == undefined) {
			throwMissingPropertyKey(this.ccId, property);
		}

		switch (propertyKey) {
			case "venetianBlindsPosition":
				return (await this.fibaroVenetianBlindsGet())?.position;
			case "venetianBlindsTilt":
				return (await this.fibaroVenetianBlindsGet())?.tilt;
			default:
				throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
		}
	};
}

export interface ManufacturerProprietaryCCOptions extends CCCommandOptions {
	manufacturerId: number;
	expectsResponse?: boolean;
}

function getReponseForManufacturerProprietary(cc: ManufacturerProprietaryCC) {
	return cc.expectsResponse ? ManufacturerProprietaryCC : undefined;
}

function testResponseForManufacturerProprietaryRequest(
	sent: ManufacturerProprietaryCC,
	received: ManufacturerProprietaryCC,
): boolean {
	// We expect a Manufacturer Proprietary response that has the same manufacturer ID as the request
	return sent.manufacturerId === received.manufacturerId;
}

@commandClass(CommandClasses["Manufacturer Proprietary"])
@implementedVersion(1)
@expectedCCResponse(
	getReponseForManufacturerProprietary,
	testResponseForManufacturerProprietaryRequest,
)
export class ManufacturerProprietaryCC extends CommandClass {
	declare ccCommand: undefined;

	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ManufacturerProprietaryCCOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			// ManufacturerProprietaryCC has no CC command, so the first byte is stored in ccCommand.
			this.manufacturerId =
				((this.ccCommand as unknown as number) << 8) + this.payload[0];
			this.payload = this.payload.slice(1);
			// Incoming messages expect no response
			this.expectsResponse = false;

			// Try to parse the proprietary command
			const PCConstructor = getProprietaryCCConstructor(
				this.manufacturerId,
			);
			if (
				PCConstructor &&
				new.target !== PCConstructor &&
				!staticExtends(new.target, PCConstructor)
			) {
				return new PCConstructor(host, options);
			}
		} else {
			this.manufacturerId = options.manufacturerId;
			this.expectsResponse = !!options.expectsResponse;
			// To use this CC, a manufacturer ID must exist in the value DB
			// If it doesn't, the interview procedure will throw.
		}
	}

	public manufacturerId: number;

	/** @internal */
	public readonly expectsResponse: boolean;

	private assertManufacturerIdIsSet(): void {
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

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		// Read the manufacturer ID from Manufacturer Specific CC
		this.manufacturerId = this.getValueDB(applHost).getValue<number>(
			getManufacturerIdValueId(),
		)!;
		this.assertManufacturerIdIsSet();

		const node = this.getNode(applHost)!;
		// TODO: Can this be refactored?
		const proprietaryConfig = applHost.getDeviceConfig?.(
			node.id,
		)?.proprietary;
		if (
			this.manufacturerId === 0x010f /* Fibaro */ &&
			proprietaryConfig &&
			isArray(proprietaryConfig.fibaroCCs) &&
			proprietaryConfig.fibaroCCs.includes(0x26 /* Venetian Blinds */)
		) {
			const FibaroVenetianBlindCC = (
				require("./manufacturerProprietary/FibaroCC") as typeof import("./manufacturerProprietary/FibaroCC")
			).FibaroVenetianBlindCC;
			await new FibaroVenetianBlindCC(this.host, {
				nodeId: this.nodeId,
				endpoint: this.endpointIndex,
			}).interview(applHost);
		} else {
			applHost.controllerLog.logNode(node.id, {
				message: `${this.constructor.name}: skipping interview because none of the implemented proprietary CCs are supported...`,
				direction: "none",
			});
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		// Read the manufacturer ID from Manufacturer Specific CC
		this.manufacturerId = this.getValueDB(applHost).getValue<number>(
			getManufacturerIdValueId(),
		)!;
		this.assertManufacturerIdIsSet();

		const node = this.getNode(applHost)!;
		// TODO: Can this be refactored?
		const proprietaryConfig = applHost.getDeviceConfig?.(
			node.id,
		)?.proprietary;
		if (
			this.manufacturerId === 0x010f /* Fibaro */ &&
			proprietaryConfig &&
			isArray(proprietaryConfig.fibaroCCs) &&
			proprietaryConfig.fibaroCCs.includes(0x26 /* Venetian Blinds */)
		) {
			const FibaroVenetianBlindCC = (
				require("./manufacturerProprietary/FibaroCC") as typeof import("./manufacturerProprietary/FibaroCC")
			).FibaroVenetianBlindCC;
			await new FibaroVenetianBlindCC(this.host, {
				nodeId: this.nodeId,
				endpoint: this.endpointIndex,
			}).refreshValues(applHost);
		} else {
			applHost.controllerLog.logNode(node.id, {
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
			return require("./manufacturerProprietary/FibaroCC").FibaroCC;
	}
}
