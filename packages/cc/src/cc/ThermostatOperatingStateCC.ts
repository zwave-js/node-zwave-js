import type { MessageOrCCLogEntry, WithAddress } from "@zwave-js/core/safe";
import {
	CommandClasses,
	type MaybeNotKnown,
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
	PhysicalCCAPI,
	type PollValueImplementation,
	throwUnsupportedProperty,
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type RefreshValuesContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import {
	ThermostatOperatingState,
	ThermostatOperatingStateCommand,
} from "../lib/_Types.js";

export const ThermostatOperatingStateCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Thermostat Operating State"], {
		...V.staticPropertyWithName(
			"operatingState",
			"state",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Operating state",
				states: enumValuesToMetadataStates(ThermostatOperatingState),
			} as const,
		),
	}),
});

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Thermostat Operating State"])
export class ThermostatOperatingStateCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: ThermostatOperatingStateCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ThermostatOperatingStateCommand.Get:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: ThermostatOperatingStateCCAPI,
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

	public async get(): Promise<MaybeNotKnown<ThermostatOperatingState>> {
		this.assertSupportsCommand(
			ThermostatOperatingStateCommand,
			ThermostatOperatingStateCommand.Get,
		);

		const cc = new ThermostatOperatingStateCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			ThermostatOperatingStateCCReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.state;
	}
}

@commandClass(CommandClasses["Thermostat Operating State"])
@implementedVersion(2)
@ccValues(ThermostatOperatingStateCCValues)
export class ThermostatOperatingStateCC extends CommandClass {
	declare ccCommand: ThermostatOperatingStateCommand;

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
			CommandClasses["Thermostat Operating State"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current state
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying thermostat operating state...",
			direction: "outbound",
		});

		const state = await api.get();
		if (state) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `received current thermostat operating state: ${
					getEnumMemberName(
						ThermostatOperatingState,
						state,
					)
				}`,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface ThermostatOperatingStateCCReportOptions {
	state: ThermostatOperatingState;
}

@CCCommand(ThermostatOperatingStateCommand.Report)
@ccValueProperty("state", ThermostatOperatingStateCCValues.operatingState)
export class ThermostatOperatingStateCCReport
	extends ThermostatOperatingStateCC
{
	public constructor(
		options: WithAddress<ThermostatOperatingStateCCReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.state = options.state;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatOperatingStateCCReport {
		validatePayload(raw.payload.length >= 1);
		const state: ThermostatOperatingState = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			state,
		});
	}

	public readonly state: ThermostatOperatingState;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				state: getEnumMemberName(ThermostatOperatingState, this.state),
			},
		};
	}
}

@CCCommand(ThermostatOperatingStateCommand.Get)
@expectedCCResponse(ThermostatOperatingStateCCReport)
export class ThermostatOperatingStateCCGet extends ThermostatOperatingStateCC {}
