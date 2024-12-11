import {
	CommandClasses,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ValueMetadata,
	type WithAddress,
	enumValuesToMetadataStates,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCParsingContext } from "@zwave-js/host/safe";
import { getEnumMemberName } from "@zwave-js/shared/safe";
import {
	CCAPI,
	POLL_VALUE,
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
	ThermostatFanState,
	ThermostatFanStateCommand,
} from "../lib/_Types.js";

export const ThermostatFanStateCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Thermostat Fan State"], {
		...V.staticPropertyWithName(
			"fanState",
			"state",
			{
				...ValueMetadata.ReadOnlyUInt8,
				states: enumValuesToMetadataStates(ThermostatFanState),
				label: "Thermostat fan state",
			} as const,
		),
	}),
});

@API(CommandClasses["Thermostat Fan State"])
export class ThermostatFanStateCCAPI extends CCAPI {
	public supportsCommand(
		cmd: ThermostatFanStateCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ThermostatFanStateCommand.Get:
				return this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: ThermostatFanStateCCAPI, { property }) {
			switch (property) {
				case "state":
					return this.get();

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ThermostatFanStateCommand,
			ThermostatFanStateCommand.Get,
		);

		const cc = new ThermostatFanStateCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			ThermostatFanStateCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return response?.state;
		}
	}
}

@commandClass(CommandClasses["Thermostat Fan State"])
@implementedVersion(2)
@ccValues(ThermostatFanStateCCValues)
export class ThermostatFanStateCC extends CommandClass {
	declare ccCommand: ThermostatFanStateCommand;

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
			CommandClasses["Thermostat Fan State"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current thermostat fan state...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "received current thermostat fan state: "
					+ getEnumMemberName(ThermostatFanState, currentStatus),
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface ThermostatFanStateCCReportOptions {
	state: ThermostatFanState;
}

@CCCommand(ThermostatFanStateCommand.Report)
@ccValueProperty("state", ThermostatFanStateCCValues.fanState)
export class ThermostatFanStateCCReport extends ThermostatFanStateCC {
	public constructor(
		options: WithAddress<ThermostatFanStateCCReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.state = options.state;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatFanStateCCReport {
		validatePayload(raw.payload.length == 1);
		const state: ThermostatFanState = raw.payload[0] & 0b1111;

		return new this({
			nodeId: ctx.sourceNodeId,
			state,
		});
	}

	public readonly state: ThermostatFanState;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			state: getEnumMemberName(ThermostatFanState, this.state),
		};
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(ThermostatFanStateCommand.Get)
@expectedCCResponse(ThermostatFanStateCCReport)
export class ThermostatFanStateCCGet extends ThermostatFanStateCC {}
