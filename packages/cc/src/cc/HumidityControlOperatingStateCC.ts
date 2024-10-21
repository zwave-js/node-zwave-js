import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	ValueMetadata,
	enumValuesToMetadataStates,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCParsingContext, GetValueDB } from "@zwave-js/host/safe";
import { getEnumMemberName } from "@zwave-js/shared/safe";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	type CCCommandOptions,
	type CCRaw,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
	type RefreshValuesContext,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	HumidityControlOperatingState,
	HumidityControlOperatingStateCommand,
} from "../lib/_Types";

export const HumidityControlOperatingStateCCValues = Object.freeze({
	...V.defineStaticCCValues(
		CommandClasses["Humidity Control Operating State"],
		{
			...V.staticProperty(
				"state",
				{
					...ValueMetadata.ReadOnlyUInt8,
					states: enumValuesToMetadataStates(
						HumidityControlOperatingState,
					),
					label: "Humidity control operating state",
				} as const,
			),
		},
	),
});

@API(CommandClasses["Humidity Control Operating State"])
export class HumidityControlOperatingStateCCAPI extends CCAPI {
	public supportsCommand(
		cmd: HumidityControlOperatingStateCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case HumidityControlOperatingStateCommand.Get:
				return this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: HumidityControlOperatingStateCCAPI,
			{ property },
		) {
			switch (property) {
				case "state":
					return this.get();

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	public async get(): Promise<HumidityControlOperatingState | undefined> {
		this.assertSupportsCommand(
			HumidityControlOperatingStateCommand,
			HumidityControlOperatingStateCommand.Get,
		);

		const cc = new HumidityControlOperatingStateCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			HumidityControlOperatingStateCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return response?.state;
		}
	}
}

@commandClass(CommandClasses["Humidity Control Operating State"])
@implementedVersion(1)
@ccValues(HumidityControlOperatingStateCCValues)
export class HumidityControlOperatingStateCC extends CommandClass {
	declare ccCommand: HumidityControlOperatingStateCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

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
			CommandClasses["Humidity Control Operating State"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current humidity control operating state...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "received current humidity control operating state: "
					+ getEnumMemberName(
						HumidityControlOperatingState,
						currentStatus,
					),
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface HumidityControlOperatingStateCCReportOptions {
	state: HumidityControlOperatingState;
}

@CCCommand(HumidityControlOperatingStateCommand.Report)
export class HumidityControlOperatingStateCCReport
	extends HumidityControlOperatingStateCC
{
	public constructor(
		options:
			& HumidityControlOperatingStateCCReportOptions
			& CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.state = options.state;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): HumidityControlOperatingStateCCReport {
		validatePayload(raw.payload.length >= 1);
		const state: HumidityControlOperatingState = raw.payload[0] & 0b1111;

		return new HumidityControlOperatingStateCCReport({
			nodeId: ctx.sourceNodeId,
			state,
		});
	}

	@ccValue(HumidityControlOperatingStateCCValues.state)
	public readonly state: HumidityControlOperatingState;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				state: getEnumMemberName(
					HumidityControlOperatingState,
					this.state,
				),
			},
		};
	}
}

@CCCommand(HumidityControlOperatingStateCommand.Get)
@expectedCCResponse(HumidityControlOperatingStateCCReport)
export class HumidityControlOperatingStateCCGet
	extends HumidityControlOperatingStateCC
{}
