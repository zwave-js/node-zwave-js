/* eslint-disable @typescript-eslint/no-var-requires */
import {
	CommandClasses,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { pick, staticExtends } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
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
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import {
	getManufacturerId,
	getManufacturerProprietaryCCConstructor,
} from "./manufacturerProprietary/Decorators";
import type { FibaroVenetianBlindCCReport } from "./manufacturerProprietary/FibaroCC";
import { getManufacturerIdValueId } from "./ManufacturerSpecificCC";

export type ManufacturerProprietaryCCConstructor<
	T extends typeof ManufacturerProprietaryCC = typeof ManufacturerProprietaryCC,
> = T & {
	// I don't like the any, but we need it to support half-implemented CCs (e.g. report classes)
	new (host: ZWaveHost, options: any): InstanceType<T>;
};

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
	manufacturerId?: number;
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
			// Incoming messages expect no response
			this.expectsResponse = false;

			// Try to parse the proprietary command
			const PCConstructor = getManufacturerProprietaryCCConstructor(
				this.manufacturerId,
			);
			if (
				PCConstructor &&
				new.target !== PCConstructor &&
				!staticExtends(new.target, PCConstructor)
			) {
				return new PCConstructor(host, options);
			}

			// If the constructor is correct, update the payload for subclass deserialization
			this.payload = this.payload.slice(1);
		} else {
			this.manufacturerId =
				options.manufacturerId ?? getManufacturerId(this);

			this.expectsResponse = !!options.expectsResponse;

			// To use this CC, a manufacturer ID must exist in the value DB
			// If it doesn't, the interview procedure will throw.
		}
	}

	public manufacturerId?: number;

	/** @internal */
	public readonly expectsResponse: boolean;

	private getManufacturerIdOrThrow(): number {
		if (this.manufacturerId == undefined) {
			throw new ZWaveError(
				`To use an instance of ManufacturerProprietaryCC, the manufacturer ID must be stored in the value DB`,
				ZWaveErrorCodes.ManufacturerProprietaryCC_NoManufacturerId,
			);
		}
		return this.manufacturerId;
	}

	public serialize(): Buffer {
		const manufacturerId = this.getManufacturerIdOrThrow();
		// ManufacturerProprietaryCC has no CC command, so the first byte
		// is stored in ccCommand
		super.ccCommand = (manufacturerId >>> 8) & 0xff;
		// The 2nd byte is in the payload
		this.payload = Buffer.concat([
			Buffer.from([
				// 2nd byte of manufacturerId
				manufacturerId & 0xff,
			]),
			this.payload,
		]);
		return super.serialize();
	}

	public createSpecificInstance(): ManufacturerProprietaryCC | undefined {
		// Try to defer to the correct subclass
		if (this.manufacturerId != undefined) {
			const PCConstructor = getManufacturerProprietaryCCConstructor(
				this.manufacturerId,
			);
			if (PCConstructor) {
				return new PCConstructor(this.host, {
					nodeId: this.nodeId,
					endpoint: this.endpointIndex,
				});
			}
		}
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		// Read the manufacturer ID from Manufacturer Specific CC
		this.manufacturerId = this.getValueDB(applHost).getValue<number>(
			getManufacturerIdValueId(),
		)!;
		const pcInstance = this.createSpecificInstance();
		if (pcInstance) {
			await pcInstance.interview(applHost);
		} else {
			applHost.controllerLog.logNode(node.id, {
				message: `${this.constructor.name}: skipping interview refresh because the matching proprietary CC is not implemented...`,
				direction: "none",
			});
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		if (this.manufacturerId == undefined) {
			// Read the manufacturer ID from Manufacturer Specific CC
			this.manufacturerId = this.getValueDB(applHost).getValue<number>(
				getManufacturerIdValueId(),
			)!;
		}
		const pcInstance = this.createSpecificInstance();
		if (pcInstance) {
			await pcInstance.refreshValues(applHost);
		} else {
			applHost.controllerLog.logNode(node.id, {
				message: `${this.constructor.name}: skipping value refresh because the matching proprietary CC is not implemented...`,
				direction: "none",
			});
		}
	}
}
