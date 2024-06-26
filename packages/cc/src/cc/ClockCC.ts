import type {
	MessageOrCCLogEntry,
	SupervisionResult,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	type MaybeNotKnown,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import { CCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { ClockCommand, Weekday } from "../lib/_Types";

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

		const cc = new ClockCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<ClockCCReport>(
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

		const cc = new ClockCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			hour,
			minute,
			weekday: weekday ?? Weekday.Unknown,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Clock)
@implementedVersion(1)
export class ClockCC extends CommandClass {
	declare ccCommand: ClockCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Clock,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
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
			applHost.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface ClockCCSetOptions extends CCCommandOptions {
	weekday: Weekday;
	hour: number;
	minute: number;
}

@CCCommand(ClockCommand.Set)
@useSupervision()
export class ClockCCSet extends ClockCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | ClockCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.weekday = options.weekday;
			this.hour = options.hour;
			this.minute = options.minute;
		}
	}

	public weekday: Weekday;
	public hour: number;
	public minute: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			((this.weekday & 0b111) << 5) | (this.hour & 0b11111),
			this.minute,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"clock setting": `${
					getEnumMemberName(
						Weekday,
						this.weekday,
					)
				}, ${padStart(this.hour.toString(), 2, "0")}:${
					padStart(
						this.minute.toString(),
						2,
						"0",
					)
				}`,
			},
		};
	}
}

@CCCommand(ClockCommand.Report)
export class ClockCCReport extends ClockCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);

		this.weekday = this.payload[0] >>> 5;
		this.hour = this.payload[0] & 0b11111;
		this.minute = this.payload[1];
		validatePayload(
			this.weekday <= Weekday.Sunday,
			this.hour <= 23,
			this.minute <= 59,
		);
	}

	public readonly weekday: Weekday;
	public readonly hour: number;
	public readonly minute: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"clock setting": `${
					getEnumMemberName(
						Weekday,
						this.weekday,
					)
				}, ${padStart(this.hour.toString(), 2, "0")}:${
					padStart(
						this.minute.toString(),
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
