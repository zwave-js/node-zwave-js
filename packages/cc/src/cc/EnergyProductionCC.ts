import {
	CommandClasses,
	type MessageOrCCLogEntry,
	MessagePriority,
	ValueMetadata,
	type WithAddress,
	encodeFloatWithScale,
	parseFloatWithScale,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	EnergyProductionCommand,
	EnergyProductionParameter,
	type EnergyProductionScale,
	getEnergyProductionScale,
} from "../lib/_Types";

export const EnergyProductionCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Energy Production"], {
		// Static CC values go here
	}),

	...V.defineDynamicCCValues(CommandClasses["Energy Production"], {
		// Dynamic CC values go here
		...V.dynamicPropertyAndKeyWithName(
			"value",
			"value",
			(parameter: EnergyProductionParameter) => parameter,
			({ property, propertyKey }) =>
				property === "value" && typeof propertyKey === "number",
			(parameter: EnergyProductionParameter) => ({
				...ValueMetadata.ReadOnlyNumber,
				label: getEnumMemberName(
					EnergyProductionParameter,
					parameter,
				),
				// unit and ccSpecific are set dynamically
			} as const),
		),
	}),
});

@API(CommandClasses["Energy Production"])
export class EnergyProductionCCAPI extends CCAPI {
	public supportsCommand(
		cmd: EnergyProductionCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case EnergyProductionCommand.Get:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: EnergyProductionCCAPI,
			{ property, propertyKey },
		) {
			if (
				EnergyProductionCCValues.value.is({
					commandClass: this.ccId,
					property,
					propertyKey,
				})
			) {
				return (await this.get(property as EnergyProductionParameter))
					?.value;
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	@validateArgs({ strictEnums: true })
	public async get(
		parameter: EnergyProductionParameter,
	): Promise<MaybeNotKnown<{ value: number; scale: EnergyProductionScale }>> {
		this.assertSupportsCommand(
			EnergyProductionCommand,
			EnergyProductionCommand.Get,
		);

		const cc = new EnergyProductionCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			parameter,
		});
		const response = await this.host.sendCommand<
			EnergyProductionCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["value", "scale"]);
		}
	}
}

@commandClass(CommandClasses["Energy Production"])
@implementedVersion(1)
@ccValues(EnergyProductionCCValues)
export class EnergyProductionCC extends CommandClass {
	declare ccCommand: EnergyProductionCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Query current values
		await this.refreshValues(ctx);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Energy Production"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		for (
			const parameter of [
				EnergyProductionParameter.Power,
				EnergyProductionParameter["Production Total"],
				EnergyProductionParameter["Production Today"],
				EnergyProductionParameter["Total Time"],
			] as const
		) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying energy production (${
					getEnumMemberName(
						EnergyProductionParameter,
						parameter,
					)
				})...`,
				direction: "outbound",
			});

			await api.get(parameter);
		}
	}
}

// @publicAPI
export interface EnergyProductionCCReportOptions {
	parameter: EnergyProductionParameter;
	scale: EnergyProductionScale;
	value: number;
}

@CCCommand(EnergyProductionCommand.Report)
export class EnergyProductionCCReport extends EnergyProductionCC {
	public constructor(
		options: WithAddress<EnergyProductionCCReportOptions>,
	) {
		super(options);
		this.parameter = options.parameter;
		this.value = options.value;
		this.scale = options.scale;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): EnergyProductionCCReport {
		validatePayload(raw.payload.length >= 2);
		const parameter: EnergyProductionParameter = raw.payload[0];
		const { value, scale: rawScale } = parseFloatWithScale(
			raw.payload.subarray(1),
		);
		const scale: EnergyProductionScale = getEnergyProductionScale(
			parameter,
			rawScale,
		);

		return new EnergyProductionCCReport({
			nodeId: ctx.sourceNodeId,
			parameter,
			value,
			scale,
		});
	}

	public readonly parameter: EnergyProductionParameter;
	public readonly scale: EnergyProductionScale;
	public readonly value: number;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		const valueValue = EnergyProductionCCValues.value(this.parameter);
		this.setMetadata(ctx, valueValue, {
			...valueValue.meta,
			unit: this.scale.unit,
			ccSpecific: {
				parameter: this.parameter,
				scale: this.scale.key,
			},
		});
		this.setValue(ctx, valueValue, this.value);

		return true;
	}

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.parameter]),
			encodeFloatWithScale(this.value, this.scale.key),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				[
					getEnumMemberName(
						EnergyProductionParameter,
						this.parameter,
					).toLowerCase()
				]: `${this.value} ${this.scale.unit}`,
			},
		};
	}
}

// @publicAPI
export interface EnergyProductionCCGetOptions {
	parameter: EnergyProductionParameter;
}

function testResponseForEnergyProductionGet(
	sent: EnergyProductionCCGet,
	received: EnergyProductionCCReport,
) {
	return received.parameter === sent.parameter;
}

@CCCommand(EnergyProductionCommand.Get)
@expectedCCResponse(
	EnergyProductionCCReport,
	testResponseForEnergyProductionGet,
)
export class EnergyProductionCCGet extends EnergyProductionCC {
	public constructor(
		options: WithAddress<EnergyProductionCCGetOptions>,
	) {
		super(options);
		this.parameter = options.parameter;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): EnergyProductionCCGet {
		validatePayload(raw.payload.length >= 1);
		const parameter: EnergyProductionParameter = raw.payload[0];

		return new EnergyProductionCCGet({
			nodeId: ctx.sourceNodeId,
			parameter,
		});
	}

	public parameter: EnergyProductionParameter;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.parameter]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				parameter: getEnumMemberName(
					EnergyProductionParameter,
					this.parameter,
				),
			},
		};
	}
}
