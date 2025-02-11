import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import type {
	GetValueDB,
	MessageOrCCLogEntry,
	SupervisionResult,
	WithAddress,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	type MaybeNotKnown,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI } from "../lib/API.js";
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
import { ClockCommand, Weekday } from "../lib/_Types.js";

// @noSetValueAPI - This CC has no simple value to set

@API(CommandClasses.Clock)
export class ClockCCAPI extends CCAPI {
	public supportsCommand(cmd: ClockCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ClockCommand.Get:
				return this.isSinglecast();
			case ClockCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(ClockCommand, ClockCommand.Get);

		const cc = new ClockCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<ClockCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["weekday", "hour", "minute"]);
		}
	}

	@validateArgs({ strictEnums: true })
	public async set(
		hour: number,
		minute: number,
		weekday?: Weekday,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(ClockCommand, ClockCommand.Set);

		const cc = new ClockCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			hour,
			minute,
			weekday: weekday ?? Weekday.Unknown,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Clock)
@implementedVersion(1)
export class ClockCC extends CommandClass {
	declare ccCommand: ClockCommand;

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
			CommandClasses.Clock,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			message: "requesting current clock setting...",
			direction: "outbound",
		});
		const response = await api.get();
		if (response) {
			const logMessage = `received current clock setting: ${
				response.weekday !== Weekday.Unknown
					? Weekday[response.weekday] + ", "
					: ""
			}${response.hour < 10 ? "0" : ""}${response.hour}:${
				response.minute < 10 ? "0" : ""
			}${response.minute}`;
			ctx.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface ClockCCSetOptions {
	weekday: Weekday;
	hour: number;
	minute: number;
}

@CCCommand(ClockCommand.Set)
@useSupervision()
export class ClockCCSet extends ClockCC {
	public constructor(
		options: WithAddress<ClockCCSetOptions>,
	) {
		super(options);
		this.weekday = options.weekday;
		this.hour = options.hour;
		this.minute = options.minute;
	}

	public static from(_raw: CCRaw, _ctx: CCParsingContext): ClockCCSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ClockCCSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public weekday: Weekday;
	public hour: number;
	public minute: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([
			((this.weekday & 0b111) << 5) | (this.hour & 0b11111),
			this.minute,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"clock setting": `${
					getEnumMemberName(
						Weekday,
						this.weekday,
					)
				}, ${this.hour.toString().padStart(2, "0")}:${
					this.minute.toString().padStart(
						2,
						"0",
					)
				}`,
			},
		};
	}
}

// @publicAPI
export interface ClockCCReportOptions {
	weekday: Weekday;
	hour: number;
	minute: number;
}

@CCCommand(ClockCommand.Report)
export class ClockCCReport extends ClockCC {
	public constructor(
		options: WithAddress<ClockCCReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.weekday = options.weekday;
		this.hour = options.hour;
		this.minute = options.minute;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): ClockCCReport {
		validatePayload(raw.payload.length >= 2);
		const weekday: Weekday = raw.payload[0] >>> 5;
		const hour = raw.payload[0] & 0b11111;
		const minute = raw.payload[1];
		validatePayload(
			weekday <= Weekday.Sunday,
			hour <= 23,
			minute <= 59,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			weekday,
			hour,
			minute,
		});
	}

	public readonly weekday: Weekday;
	public readonly hour: number;
	public readonly minute: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"clock setting": `${
					getEnumMemberName(
						Weekday,
						this.weekday,
					)
				}, ${this.hour.toString().padStart(2, "0")}:${
					this.minute.toString().padStart(
						2,
						"0",
					)
				}`,
			},
		};
	}
}

@CCCommand(ClockCommand.Get)
@expectedCCResponse(ClockCCReport)
export class ClockCCGet extends ClockCC {}
