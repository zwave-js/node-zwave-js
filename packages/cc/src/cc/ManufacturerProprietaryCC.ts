import {
	CommandClasses,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCEncodingContext, CCParsingContext } from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, type CCAPIEndpoint, type CCAPIHost } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type RefreshValuesContext,
} from "../lib/CommandClass.js";
import {
	API,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import { ManufacturerSpecificCCValues } from "./ManufacturerSpecificCC.js";
import {
	getManufacturerId,
	getManufacturerProprietaryAPI,
	getManufacturerProprietaryCCConstructor,
} from "./manufacturerProprietary/Decorators.js";

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
		data?: Uint8Array,
	): Promise<void> {
		const cc = new ManufacturerProprietaryCC({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			manufacturerId,
		});
		cc.payload = data ? Bytes.view(data) : new Bytes();

		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async sendAndReceiveData(manufacturerId: number, data?: Uint8Array) {
		const cc = new ManufacturerProprietaryCC({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			manufacturerId,
			unspecifiedExpectsResponse: true,
		});
		cc.payload = data ? Bytes.view(data) : new Bytes();

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
export interface ManufacturerProprietaryCCOptions {
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
		options: WithAddress<ManufacturerProprietaryCCOptions>,
	) {
		super(options);

		this.manufacturerId = options.manufacturerId
			?? getManufacturerId(this);
		this.unspecifiedExpectsResponse = options.unspecifiedExpectsResponse;

		// To use this CC, a manufacturer ID must exist in the value DB
		// If it doesn't, the interview procedure will throw.
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ManufacturerProprietaryCC {
		validatePayload(raw.payload.length >= 1);
		const manufacturerId = raw.payload.readUInt16BE(0);
		// Try to parse the proprietary command
		const PCConstructor = getManufacturerProprietaryCCConstructor(
			manufacturerId,
		);
		if (PCConstructor) {
			return PCConstructor.from(
				raw.withPayload(raw.payload.subarray(2)),
				ctx,
			);
		}

		return new ManufacturerProprietaryCC({
			nodeId: ctx.sourceNodeId,
			manufacturerId,
		});
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

	public serialize(ctx: CCEncodingContext): Bytes {
		const manufacturerId = this.getManufacturerIdOrThrow();
		// ManufacturerProprietaryCC has no CC command, so the first byte
		// is stored in ccCommand
		(this.ccCommand as unknown as number) = (manufacturerId >>> 8) & 0xff;
		// The 2nd byte is in the payload
		this.payload = Bytes.concat([
			Bytes.from([
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
