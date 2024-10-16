import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	type MessageRecord,
	NodeStatus,
	type SupervisionResult,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCEncodingContext, GetValueDB } from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { PhysicalCCAPI } from "../lib/API";
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
import {
	Powerlevel,
	PowerlevelCommand,
	PowerlevelTestStatus,
} from "../lib/_Types";

@API(CommandClasses.Powerlevel)
export class PowerlevelCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: PowerlevelCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case PowerlevelCommand.Get:
			case PowerlevelCommand.Report:
			case PowerlevelCommand.TestNodeGet:
			case PowerlevelCommand.TestNodeReport:
				return this.isSinglecast();

			case PowerlevelCommand.Set:
			case PowerlevelCommand.TestNodeSet:
				return true;
		}
		return super.supportsCommand(cmd);
	}

	public async setNormalPowerlevel(): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Set);

		const cc = new PowerlevelCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			powerlevel: Powerlevel["Normal Power"],
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async setCustomPowerlevel(
		powerlevel: Powerlevel,
		timeout: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Set);

		const cc = new PowerlevelCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			powerlevel,
			timeout,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getPowerlevel(): Promise<
		MaybeNotKnown<Pick<PowerlevelCCReport, "powerlevel" | "timeout">>
	> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Get);

		const cc = new PowerlevelCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<PowerlevelCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["powerlevel", "timeout"]);
		}
	}

	@validateArgs()
	public async reportPowerlevel(
		options: PowerlevelCCReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Report);

		const cc = new PowerlevelCCReport({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async startNodeTest(
		testNodeId: number,
		powerlevel: Powerlevel,
		testFrameCount: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			PowerlevelCommand,
			PowerlevelCommand.TestNodeSet,
		);

		if (testNodeId === this.endpoint.nodeId) {
			throw new ZWaveError(
				`For a powerlevel test, the test node ID must different from the source node ID.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		const testNode = this.host.getNodeOrThrow(testNodeId);
		if (testNode.isFrequentListening) {
			throw new ZWaveError(
				`Node ${testNodeId} is FLiRS and therefore cannot be used for a powerlevel test.`,
				ZWaveErrorCodes.PowerlevelCC_UnsupportedTestNode,
			);
		}
		if (testNode.canSleep && testNode.status !== NodeStatus.Awake) {
			throw new ZWaveError(
				`Node ${testNodeId} is not awake and therefore cannot be used for a powerlevel test.`,
				ZWaveErrorCodes.PowerlevelCC_UnsupportedTestNode,
			);
		}

		const cc = new PowerlevelCCTestNodeSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			testNodeId,
			powerlevel,
			testFrameCount,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getNodeTestStatus(): Promise<
		MaybeNotKnown<
			Pick<
				PowerlevelCCTestNodeReport,
				"testNodeId" | "status" | "acknowledgedFrames"
			>
		>
	> {
		this.assertSupportsCommand(
			PowerlevelCommand,
			PowerlevelCommand.TestNodeGet,
		);

		const cc = new PowerlevelCCTestNodeGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			PowerlevelCCTestNodeReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"testNodeId",
				"status",
				"acknowledgedFrames",
			]);
		}
	}

	@validateArgs()
	public async sendNodeTestReport(
		options: PowerlevelCCTestNodeReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			PowerlevelCommand,
			PowerlevelCommand.TestNodeReport,
		);

		const cc = new PowerlevelCCTestNodeReport({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Powerlevel)
@implementedVersion(1)
export class PowerlevelCC extends CommandClass {
	declare ccCommand: PowerlevelCommand;
}

// @publicAPI
export type PowerlevelCCSetOptions =
	& CCCommandOptions
	& (
		| {
			powerlevel: Powerlevel;
			timeout: number;
		}
		| {
			powerlevel: (typeof Powerlevel)["Normal Power"];
			timeout?: undefined;
		}
	);

@CCCommand(PowerlevelCommand.Set)
@useSupervision()
export class PowerlevelCCSet extends PowerlevelCC {
	public constructor(
		options: CommandClassDeserializationOptions | PowerlevelCCSetOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.powerlevel = this.payload[0];
			if (this.powerlevel !== Powerlevel["Normal Power"]) {
				this.timeout = this.payload[1];
			}
		} else {
			this.powerlevel = options.powerlevel;
			if (options.powerlevel !== Powerlevel["Normal Power"]) {
				if (options.timeout < 1 || options.timeout > 255) {
					throw new ZWaveError(
						`The timeout parameter must be between 1 and 255.`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				this.timeout = options.timeout;
			}
		}
	}

	public powerlevel: Powerlevel;
	public timeout?: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.powerlevel, this.timeout ?? 0x00]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"power level": getEnumMemberName(Powerlevel, this.powerlevel),
		};
		if (this.timeout != undefined) {
			message.timeout = `${this.timeout} s`;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type PowerlevelCCReportOptions = {
	powerlevel: typeof Powerlevel["Normal Power"];
	timeout?: undefined;
} | {
	powerlevel: Exclude<Powerlevel, typeof Powerlevel["Normal Power"]>;
	timeout: number;
};

@CCCommand(PowerlevelCommand.Report)
export class PowerlevelCCReport extends PowerlevelCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| (PowerlevelCCReportOptions & CCCommandOptions),
	) {
		super(options);

		if (gotDeserializationOptions(options)) {
			this.powerlevel = this.payload[0];
			if (this.powerlevel !== Powerlevel["Normal Power"]) {
				this.timeout = this.payload[1];
			}
		} else {
			this.powerlevel = options.powerlevel;
			this.timeout = options.timeout;
		}
	}

	public readonly powerlevel: Powerlevel;
	public readonly timeout?: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.powerlevel, this.timeout ?? 0x00]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"power level": getEnumMemberName(Powerlevel, this.powerlevel),
		};
		if (this.timeout != undefined) {
			message.timeout = `${this.timeout} s`;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(PowerlevelCommand.Get)
@expectedCCResponse(PowerlevelCCReport)
export class PowerlevelCCGet extends PowerlevelCC {}

// @publicAPI
export interface PowerlevelCCTestNodeSetOptions extends CCCommandOptions {
	testNodeId: number;
	powerlevel: Powerlevel;
	testFrameCount: number;
}

@CCCommand(PowerlevelCommand.TestNodeSet)
@useSupervision()
export class PowerlevelCCTestNodeSet extends PowerlevelCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| PowerlevelCCTestNodeSetOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 4);
			this.testNodeId = this.payload[0];
			this.powerlevel = this.payload[1];
			this.testFrameCount = this.payload.readUInt16BE(2);
		} else {
			this.testNodeId = options.testNodeId;
			this.powerlevel = options.powerlevel;
			this.testFrameCount = options.testFrameCount;
		}
	}

	public testNodeId: number;
	public powerlevel: Powerlevel;
	public testFrameCount: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.testNodeId, this.powerlevel, 0, 0]);
		this.payload.writeUInt16BE(this.testFrameCount, 2);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"test node id": this.testNodeId,
				"power level": getEnumMemberName(Powerlevel, this.powerlevel),
				"test frame count": this.testFrameCount,
			},
		};
	}
}

// @publicAPI
export interface PowerlevelCCTestNodeReportOptions {
	testNodeId: number;
	status: PowerlevelTestStatus;
	acknowledgedFrames: number;
}

@CCCommand(PowerlevelCommand.TestNodeReport)
export class PowerlevelCCTestNodeReport extends PowerlevelCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| (PowerlevelCCTestNodeReportOptions & CCCommandOptions),
	) {
		super(options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 4);
			this.testNodeId = this.payload[0];
			this.status = this.payload[1];
			this.acknowledgedFrames = this.payload.readUInt16BE(2);
		} else {
			this.testNodeId = options.testNodeId;
			this.status = options.status;
			this.acknowledgedFrames = options.acknowledgedFrames;
		}
	}

	public testNodeId: number;
	public status: PowerlevelTestStatus;
	public acknowledgedFrames: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.testNodeId,
			this.status,
			// Placeholder for acknowledged frames
			0,
			0,
		]);
		this.payload.writeUInt16BE(this.acknowledgedFrames, 2);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"test node id": this.testNodeId,
				status: getEnumMemberName(PowerlevelTestStatus, this.status),
				"acknowledged frames": this.acknowledgedFrames,
			},
		};
	}
}

@CCCommand(PowerlevelCommand.TestNodeGet)
@expectedCCResponse(PowerlevelCCTestNodeReport)
export class PowerlevelCCTestNodeGet extends PowerlevelCC {}
