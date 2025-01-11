import {
	CommandClasses,
	type GetValueDB,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type ValueID,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import { Bytes } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import {
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../../lib/API.js";
import {
	type CCRaw,
	type CommandClassOptions,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
} from "../../lib/CommandClass.js";
import {
	ManufacturerProprietaryCC,
	ManufacturerProprietaryCCAPI,
} from "../ManufacturerProprietaryCC.js";
import {
	manufacturerId,
	manufacturerProprietaryAPI,
} from "./Decorators.js";

export const MANUFACTURERID_INTERMATIC_LEGACY = 0x0005;
export const MANUFACTURERID_INTERMATIC_NEW = 0x0072;

/** Returns the ValueID used to store the current water temperature */
export function getIntermaticWaterTempValueId(): ValueID {
	return {
		commandClass: CommandClasses["Manufacturer Proprietary"],
		property: "intermatic",
		propertyKey: "waterTemperature",
	};
}

/** Returns the value metadata for water temperature */
export function getIntermaticWaterTempMetadata(): ValueMetadata {
	return {
		...ValueMetadata.Number,
		label: "Water Temperature",
		unit: "°F",
		min: 0,
		max: 100,
	};
}

@manufacturerProprietaryAPI([MANUFACTURERID_INTERMATIC_LEGACY, MANUFACTURERID_INTERMATIC_NEW])
export class IntermaticPE653CCAPI extends ManufacturerProprietaryCCAPI {
	public async getWaterTemperature(): Promise<number | undefined> {
		const valueId = getIntermaticWaterTempValueId();
		return this.getValueDB()?.getValue(valueId);
	}

	protected get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: IntermaticPE653CCAPI,
			{ property },
			value,
		) {
			if (property !== "intermatic") {
				throwUnsupportedProperty(this.ccId, property);
			}
			
			// This is a read-only CC
			throwWrongValueType(this.ccId, property, "readonly", typeof value);
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: IntermaticPE653CCAPI, { property }) {
			if (property !== "intermatic") {
				throwUnsupportedProperty(this.ccId, property);
			}

			return this.getWaterTemperature();
		};
	}
}

@manufacturerId([MANUFACTURERID_INTERMATIC_LEGACY, MANUFACTURERID_INTERMATIC_NEW])
export class IntermaticPE653CC extends ManufacturerProprietaryCC {
	public constructor(options: CommandClassOptions) {
		super(options);
		// Use the legacy ID by default, it will be overridden if needed
		this.manufacturerId = MANUFACTURERID_INTERMATIC_LEGACY;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): IntermaticPE653CC {
		const cc = new IntermaticPE653CC({
			nodeId: ctx.sourceNodeId,
		});

		// Validate payload length for PE653 v3.1 water temperature frame
		validatePayload(raw.payload.length >= 13, "PE653 frame too short");

		// Parse the payload according to the Intermatic PE653 protocol
		const waterTemp = raw.payload[12];
		cc.waterTemperature = waterTemp;

		return cc;
	}

	public waterTemperature?: number;

	public async interview(ctx: InterviewContext): Promise<void> {
		// No interview needed for this CC
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(ctx: RefreshValuesContext): Promise<void> {
		// This CC is read-only and updates are received automatically
		// Skip refresh since this is a read-only CC
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (this.waterTemperature != undefined) {
			const valueId = getIntermaticWaterTempValueId();
			const metadata = getIntermaticWaterTempMetadata();
			
			this.getValueDB(ctx)?.setMetadata(valueId, metadata);
			this.getValueDB(ctx)?.setValue(valueId, this.waterTemperature);
			return true;
		}
		return false;
	}

	public serialize(ctx: CCEncodingContext): Bytes {
		// The manufacturer ID is encoded in the first two bytes
		const manufacturerId = this.manufacturerId ?? MANUFACTURERID_INTERMATIC_LEGACY;
		(this.ccCommand as unknown as number) = (manufacturerId >>> 8) & 0xff;
		this.payload = Bytes.from([manufacturerId & 0xff]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			waterTemperature: this.waterTemperature ?? "unknown",
		};
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
} 