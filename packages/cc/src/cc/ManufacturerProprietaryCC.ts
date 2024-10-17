import {
	CommandClasses,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCEncodingContext } from "@zwave-js/host/safe";
import { staticExtends } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, type CCAPIEndpoint, type CCAPIHost } from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
	type RefreshValuesContext,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { ManufacturerSpecificCCValues } from "./ManufacturerSpecificCC";
import {
	getManufacturerId,
	getManufacturerProprietaryAPI,
	getManufacturerProprietaryCCConstructor,
} from "./manufacturerProprietary/Decorators";

export type ManufacturerProprietaryCCConstructor<
	T extends typeof ManufacturerProprietaryCC =
		typeof ManufacturerProprietaryCC,
> = T & {
	// I don't like the any, but we need it to support half-implemented CCs (e.g. report classes)
	new (options: any): InstanceType<T>;
};

@API(CommandClasses["Manufacturer Proprietary"])
export class ManufacturerProprietaryCCAPI extends CCAPI {
	public constructor(
		host: CCAPIHost,
		endpoint: CCAPIEndpoint,
	) {
		super(host, endpoint);

		// Read the manufacturer ID from Manufacturer Specific CC
		const manufacturerId = this.getValueDB().getValue<number>(
			ManufacturerSpecificCCValues.manufacturerId.id,
		);
		// If possible, try to defer to a specific subclass of this API
		if (manufacturerId != undefined) {
			const SpecificAPIConstructor = getManufacturerProprietaryAPI(
				manufacturerId,
			);
			if (
				SpecificAPIConstructor != undefined
				&& new.target !== SpecificAPIConstructor
			) {
				return new SpecificAPIConstructor(host, endpoint);
			}
		}
	}

	@validateArgs()
	public async sendData(
		manufacturerId: number,
		data?: Buffer,
	): Promise<void> {
		const cc = new ManufacturerProprietaryCC({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			manufacturerId,
		});
		cc.payload = data ?? Buffer.allocUnsafe(0);

		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async sendAndReceiveData(manufacturerId: number, data?: Buffer) {
		const cc = new ManufacturerProprietaryCC({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			manufacturerId,
			unspecifiedExpectsResponse: true,
		});
		cc.payload = data ?? Buffer.allocUnsafe(0);

		const response = await this.host.sendCommand<
			ManufacturerProprietaryCC
		>(
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

// @publicAPI
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
		options:
			| CommandClassDeserializationOptions
			| ManufacturerProprietaryCCOptions,
	) {
		super(options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			// ManufacturerProprietaryCC has no CC command, so the first byte is stored in ccCommand.
			this.manufacturerId = ((this.ccCommand as unknown as number) << 8)
				+ this.payload[0];

			// Try to parse the proprietary command
			const PCConstructor = getManufacturerProprietaryCCConstructor(
				this.manufacturerId,
			);
			if (
				PCConstructor
				&& new.target !== PCConstructor
				&& !staticExtends(new.target, PCConstructor)
			) {
				return new PCConstructor(options);
			}

			// If the constructor is correct, update the payload for subclass deserialization
			this.payload = this.payload.subarray(1);
		} else {
			this.manufacturerId = options.manufacturerId
				?? getManufacturerId(this);

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

	public serialize(ctx: CCEncodingContext): Buffer {
		const manufacturerId = this.getManufacturerIdOrThrow();
		// ManufacturerProprietaryCC has no CC command, so the first byte
		// is stored in ccCommand
		(this.ccCommand as unknown as number) = (manufacturerId >>> 8) & 0xff;
		// The 2nd byte is in the payload
		this.payload = Buffer.concat([
			Buffer.from([
				// 2nd byte of manufacturerId
				manufacturerId & 0xff,
			]),
			this.payload,
		]);
		return super.serialize(ctx);
	}

	public createSpecificInstance(): ManufacturerProprietaryCC | undefined {
		// Try to defer to the correct subclass
		if (this.manufacturerId != undefined) {
			const PCConstructor = getManufacturerProprietaryCCConstructor(
				this.manufacturerId,
			);
			if (PCConstructor) {
				return new PCConstructor({
					nodeId: this.nodeId,
					endpoint: this.endpointIndex,
				});
			}
		}
	}

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		// Read the manufacturer ID from Manufacturer Specific CC
		this.manufacturerId = this.getValue(
			ctx,
			ManufacturerSpecificCCValues.manufacturerId,
		)!;
		const pcInstance = this.createSpecificInstance();
		if (pcInstance) {
			await pcInstance.interview(ctx);
		} else {
			ctx.logNode(node.id, {
				message:
					`${this.constructor.name}: skipping interview refresh because the matching proprietary CC is not implemented...`,
				direction: "none",
			});
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		if (this.manufacturerId == undefined) {
			// Read the manufacturer ID from Manufacturer Specific CC
			this.manufacturerId = this.getValue(
				ctx,
				ManufacturerSpecificCCValues.manufacturerId,
			)!;
		}
		const pcInstance = this.createSpecificInstance();
		if (pcInstance) {
			await pcInstance.refreshValues(ctx);
		} else {
			ctx.logNode(node.id, {
				message:
					`${this.constructor.name}: skipping value refresh because the matching proprietary CC is not implemented...`,
				direction: "none",
			});
		}
	}
}
