import {
	CommandClasses,
	IVirtualEndpoint,
	IZWaveEndpoint,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { staticExtends } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI } from "../lib/API";
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
	getManufacturerProprietaryAPI,
	getManufacturerProprietaryCCConstructor,
} from "./manufacturerProprietary/Decorators";
import { ManufacturerSpecificCCValues } from "./ManufacturerSpecificCC";

export type ManufacturerProprietaryCCConstructor<
	T extends typeof ManufacturerProprietaryCC = typeof ManufacturerProprietaryCC,
> = T & {
	// I don't like the any, but we need it to support half-implemented CCs (e.g. report classes)
	new (host: ZWaveHost, options: any): InstanceType<T>;
};

@API(CommandClasses["Manufacturer Proprietary"])
export class ManufacturerProprietaryCCAPI extends CCAPI {
	public constructor(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint | IVirtualEndpoint,
	) {
		super(applHost, endpoint);

		// Read the manufacturer ID from Manufacturer Specific CC
		const manufacturerId = this.getValueDB().getValue<number>(
			ManufacturerSpecificCCValues.manufacturerId.id,
		);
		// If possible, try to defer to a specific subclass of this API
		if (manufacturerId != undefined) {
			const SpecificAPIConstructor =
				getManufacturerProprietaryAPI(manufacturerId);
			if (
				SpecificAPIConstructor != undefined &&
				new.target !== SpecificAPIConstructor
			) {
				return new SpecificAPIConstructor(applHost, endpoint);
			}
		}
	}

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
			unspecifiedExpectsResponse: true,
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
}

export interface ManufacturerProprietaryCCOptions extends CCCommandOptions {
	manufacturerId?: number;
	unspecifiedExpectsResponse?: boolean;
}

function getReponseForManufacturerProprietary(cc: ManufacturerProprietaryCC) {
	return cc.unspecifiedExpectsResponse
		? ManufacturerProprietaryCC
		: undefined;
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

			this.unspecifiedExpectsResponse =
				options.unspecifiedExpectsResponse;

			// To use this CC, a manufacturer ID must exist in the value DB
			// If it doesn't, the interview procedure will throw.
		}
	}

	public manufacturerId?: number;

	/**
	 * @internal
	 * This is used to indicate that an unspecified Manufacturer Proprietary CC instance expects a response.
	 * Subclasses should roll their own `@expectedCCResponse` instead.
	 */
	public readonly unspecifiedExpectsResponse?: boolean;

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
			ManufacturerSpecificCCValues.manufacturerId.id,
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
				ManufacturerSpecificCCValues.manufacturerId.id,
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
