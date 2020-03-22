import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { validatePayload } from "../util/misc";
import type { Maybe } from "../values/Primitive";
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
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum ClockCommand {
	Set = 0x04,
	Get = 0x05,
	Report = 0x06,
}

export enum Weekday {
	Unknown = 0x00,
	Monday = 0x01,
	Tuesday = 0x02,
	Wednesday = 0x03,
	Thursday = 0x04,
	Friday = 0x05,
	Saturday = 0x06,
	Sunday = 0x07,
}

// @noSetValueAPI - This CC has no simple value to set

@API(CommandClasses.Clock)
export class ClockCCAPI extends CCAPI {
	public supportsCommand(cmd: ClockCommand): Maybe<boolean> {
		switch (cmd) {
			case ClockCommand.Get:
			case ClockCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		this.assertSupportsCommand(ClockCommand, ClockCommand.Get);

		const cc = new ClockCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<ClockCCReport>(cc))!;
		return {
			weekday: response.weekday,
			hour: response.hour,
			minute: response.minute,
		};
	}

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
		await this.driver.sendCommand(cc);

		// Refresh the current value
		await this.get();
	}
}

@commandClass(CommandClasses.Clock)
@implementedVersion(1)
export class ClockCC extends CommandClass {
	declare ccCommand: ClockCommand;

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const api = this.getEndpoint()!.commandClasses.Clock;

		log.controller.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		log.controller.logNode(node.id, {
			message: "requesting current clock setting...",
			direction: "outbound",
		});
		const response = await api.get();
		const logMessage = `received current clock setting: ${
			response.weekday !== Weekday.Unknown
				? Weekday[response.weekday] + ", "
				: ""
		}${response.hour < 10 ? "0" : ""}${response.hour}:${
			response.minute < 10 ? "0" : ""
		}${response.minute}`;
		log.controller.logNode(node.id, {
			message: logMessage,
			direction: "inbound",
		});

		// Remember that the interview is complete
		this.interviewComplete = true;
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
		driver: Driver,
		options: CommandClassDeserializationOptions | ClockCCSetOptions,
	) {
		super(driver, options);
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
}

@CCCommand(ClockCommand.Report)
export class ClockCCReport extends ClockCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
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
}

@CCCommand(ClockCommand.Get)
@expectedCCResponse(ClockCCReport)
export class ClockCCGet extends ClockCC {}
