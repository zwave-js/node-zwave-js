import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import {
	CommandClasses,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	type WithAddress,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
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
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import {
	type SetbackState,
	SetbackType,
	ThermostatSetbackCommand,
} from "../lib/_Types.js";
import { decodeSetbackState, encodeSetbackState } from "../lib/serializers.js";

// @noSetValueAPI
// The setback state consist of two values that must be set together

@API(CommandClasses["Thermostat Setback"])
export class ThermostatSetbackCCAPI extends CCAPI {
	public supportsCommand(
		cmd: ThermostatSetbackCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ThermostatSetbackCommand.Get:
				return this.isSinglecast();
			case ThermostatSetbackCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: ThermostatSetbackCCAPI, { property }) {
			switch (property) {
				case "setbackType":
				case "setbackState":
					return (await this.get())?.[property];

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ThermostatSetbackCommand,
			ThermostatSetbackCommand.Get,
		);

		const cc = new ThermostatSetbackCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			ThermostatSetbackCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["setbackType", "setbackState"]);
		}
	}

	@validateArgs()
	public async set(
		setbackType: SetbackType,
		setbackState: SetbackState,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ThermostatSetbackCommand,
			ThermostatSetbackCommand.Get,
		);

		const cc = new ThermostatSetbackCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			setbackType,
			setbackState,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Thermostat Setback"])
@implementedVersion(1)
export class ThermostatSetbackCC extends CommandClass {
	declare ccCommand: ThermostatSetbackCommand;

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
			CommandClasses["Thermostat Setback"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the thermostat state
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying the current thermostat state...",
			direction: "outbound",
		});
		const setbackResp = await api.get();
		if (setbackResp) {
			const logMessage = `received current state:
setback type:  ${getEnumMemberName(SetbackType, setbackResp.setbackType)}
setback state: ${setbackResp.setbackState}`;
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface ThermostatSetbackCCSetOptions {
	setbackType: SetbackType;
	setbackState: SetbackState;
}

@CCCommand(ThermostatSetbackCommand.Set)
@useSupervision()
export class ThermostatSetbackCCSet extends ThermostatSetbackCC {
	public constructor(
		options: WithAddress<ThermostatSetbackCCSetOptions>,
	) {
		super(options);
		this.setbackType = options.setbackType;
		this.setbackState = options.setbackState;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatSetbackCCSet {
		validatePayload(raw.payload.length >= 2);
		const setbackType: SetbackType = raw.payload[0] & 0b11;

		const setbackState: SetbackState = decodeSetbackState(raw.payload, 1)
			// If we receive an unknown setback state, return the raw value
			|| raw.payload.readInt8(1);

		return new this({
			nodeId: ctx.sourceNodeId,
			setbackType,
			setbackState,
		});
	}

	public setbackType: SetbackType;
	/** The offset from the setpoint in 0.1 Kelvin or a special mode */
	public setbackState: SetbackState;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			[this.setbackType & 0b11],
			encodeSetbackState(this.setbackState),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"setback type": getEnumMemberName(
					SetbackType,
					this.setbackType,
				),
				"setback state": typeof this.setbackState === "number"
					? `${this.setbackState} K`
					: this.setbackState,
			},
		};
	}
}

// @publicAPI
export interface ThermostatSetbackCCReportOptions {
	setbackType: SetbackType;
	setbackState: SetbackState;
}

@CCCommand(ThermostatSetbackCommand.Report)
export class ThermostatSetbackCCReport extends ThermostatSetbackCC {
	public constructor(
		options: WithAddress<ThermostatSetbackCCReportOptions>,
	) {
		super(options);

		this.setbackType = options.setbackType;
		this.setbackState = options.setbackState;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatSetbackCCReport {
		validatePayload(raw.payload.length >= 2);
		const setbackType: SetbackType = raw.payload[0] & 0b11;

		const setbackState: SetbackState = decodeSetbackState(raw.payload, 1)
			// If we receive an unknown setback state, return the raw value
			|| raw.payload.readInt8(1);

		return new this({
			nodeId: ctx.sourceNodeId,
			setbackType,
			setbackState,
		});
	}

	public readonly setbackType: SetbackType;
	/** The offset from the setpoint in 0.1 Kelvin or a special mode */
	public readonly setbackState: SetbackState;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			[this.setbackType & 0b11],
			encodeSetbackState(this.setbackState),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"setback type": getEnumMemberName(
					SetbackType,
					this.setbackType,
				),
				"setback state": typeof this.setbackState === "number"
					? `${this.setbackState} K`
					: this.setbackState,
			},
		};
	}
}

@CCCommand(ThermostatSetbackCommand.Get)
@expectedCCResponse(ThermostatSetbackCCReport)
export class ThermostatSetbackCCGet extends ThermostatSetbackCC {}
