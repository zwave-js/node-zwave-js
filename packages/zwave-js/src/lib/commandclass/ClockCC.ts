import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core";
import {
	CommandClasses,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import type { Driver } from "../driver/Driver";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { ClockCommand, Weekday } from "./_Types";

// @noSetValueAPI - This CC has no simple value to set

@API(CommandClasses.Clock)
export class ClockCCAPI extends CCAPI {
	public supportsCommand(cmd: ClockCommand): Maybe<boolean> {
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

		const cc = new ClockCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<ClockCCReport>(
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
	): Promise<void> {
		this.assertSupportsCommand(ClockCommand, ClockCommand.Set);

		const cc = new ClockCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			hour,
			minute,
			weekday: weekday ?? Weekday.Unknown,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Clock)
@implementedVersion(1)
export class ClockCC extends CommandClass {
	declare ccCommand: ClockCommand;

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(driver);

		// Remember that the interview is complete
		this.setInterviewComplete(driver, true);
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses.Clock.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		driver.controllerLog.logNode(node.id, {
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
			driver.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

interface ClockCCSetOptions extends CCCommandOptions {
	weekday: Weekday;
	hour: number;
	minute: number;
}

@CCCommand(ClockCommand.Set)
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"clock setting": `${getEnumMemberName(
					Weekday,
					this.weekday,
				)}, ${padStart(this.hour.toString(), 2, "0")}:${padStart(
					this.minute.toString(),
					2,
					"0",
				)}`,
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"clock setting": `${getEnumMemberName(
					Weekday,
					this.weekday,
				)}, ${padStart(this.hour.toString(), 2, "0")}:${padStart(
					this.minute.toString(),
					2,
					"0",
				)}`,
			},
		};
	}
}

@CCCommand(ClockCommand.Get)
@expectedCCResponse(ClockCCReport)
export class ClockCCGet extends ClockCC {}
