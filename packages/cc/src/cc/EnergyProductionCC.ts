import {
	CommandClasses,
	type MessageOrCCLogEntry,
	MessagePriority,
	ValueMetadata,
	encodeFloatWithScale,
	parseFloatWithScale,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
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
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
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

		const cc = new EnergyProductionCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			parameter,
		});
		const response = await this.applHost.sendCommand<
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

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Query current values
		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Energy Production"],
			applHost,
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
			applHost.controllerLog.logNode(node.id, {
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
export interface EnergyProductionCCReportOptions extends CCCommandOptions {
	parameter: EnergyProductionParameter;
	scale: EnergyProductionScale;
	value: number;
}

@CCCommand(EnergyProductionCommand.Report)
export class EnergyProductionCCReport extends EnergyProductionCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| EnergyProductionCCReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.parameter = this.payload[0];
			const { value, scale } = parseFloatWithScale(
				this.payload.subarray(1),
			);
			this.value = value;
			this.scale = getEnergyProductionScale(this.parameter, scale);
		} else {
			this.parameter = options.parameter;
			this.value = options.value;
			this.scale = options.scale;
		}
	}

	public readonly parameter: EnergyProductionParameter;
	public readonly scale: EnergyProductionScale;
	public readonly value: number;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const valueValue = EnergyProductionCCValues.value(this.parameter);
		this.setMetadata(applHost, valueValue, {
			...valueValue.meta,
			unit: this.scale.unit,
			ccSpecific: {
				parameter: this.parameter,
				scale: this.scale.key,
			},
		});
		this.setValue(applHost, valueValue, this.value);

		return true;
	}

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.parameter]),
			encodeFloatWithScale(this.value, this.scale.key),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
export interface EnergyProductionCCGetOptions extends CCCommandOptions {
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| EnergyProductionCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.parameter = this.payload[0];
		} else {
			this.parameter = options.parameter;
		}
	}

	public parameter: EnergyProductionParameter;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.parameter]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				parameter: getEnumMemberName(
					EnergyProductionParameter,
					this.parameter,
				),
			},
		};
	}
}
