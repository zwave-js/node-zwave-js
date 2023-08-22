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
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
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
			case PowerlevelCommand.TestNodeGet:
				return this.isSinglecast();
			case PowerlevelCommand.Set:
			case PowerlevelCommand.TestNodeSet:
				return true;
		}
		return super.supportsCommand(cmd);
	}

	public async setNormalPowerlevel(): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Set);

		const cc = new PowerlevelCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			powerlevel: Powerlevel["Normal Power"],
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async setCustomPowerlevel(
		powerlevel: Powerlevel,
		timeout: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Set);

		const cc = new PowerlevelCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			powerlevel,
			timeout,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getPowerlevel(): Promise<
		MaybeNotKnown<Pick<PowerlevelCCReport, "powerlevel" | "timeout">>
	> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Get);

		const cc = new PowerlevelCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<PowerlevelCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["powerlevel", "timeout"]);
		}
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
		const testNode = this.applHost.nodes.getOrThrow(testNodeId);
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

		const cc = new PowerlevelCCTestNodeSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			testNodeId,
			powerlevel,
			testFrameCount,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
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

		const cc = new PowerlevelCCTestNodeGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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
}

@commandClass(CommandClasses.Powerlevel)
@implementedVersion(1)
export class PowerlevelCC extends CommandClass {
	declare ccCommand: PowerlevelCommand;
}

type PowerlevelCCSetOptions =
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | PowerlevelCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

	public serialize(): Buffer {
		this.payload = Buffer.from([this.powerlevel, this.timeout ?? 0x00]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"power level": getEnumMemberName(Powerlevel, this.powerlevel),
		};
		if (this.timeout != undefined) {
			message.timeout = `${this.timeout} s`;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(PowerlevelCommand.Report)
export class PowerlevelCCReport extends PowerlevelCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		this.powerlevel = this.payload[0];
		if (this.powerlevel !== Powerlevel["Normal Power"]) {
			this.timeout = this.payload[1];
		}
	}

	public readonly powerlevel: Powerlevel;
	public readonly timeout?: number;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"power level": getEnumMemberName(Powerlevel, this.powerlevel),
		};
		if (this.timeout != undefined) {
			message.timeout = `${this.timeout} s`;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(PowerlevelCommand.Get)
@expectedCCResponse(PowerlevelCCReport)
export class PowerlevelCCGet extends PowerlevelCC {}

interface PowerlevelCCTestNodeSetOptions extends CCCommandOptions {
	testNodeId: number;
	powerlevel: Powerlevel;
	testFrameCount: number;
}

@CCCommand(PowerlevelCommand.TestNodeSet)
@useSupervision()
export class PowerlevelCCTestNodeSet extends PowerlevelCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| PowerlevelCCTestNodeSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.testNodeId = options.testNodeId;
			this.powerlevel = options.powerlevel;
			this.testFrameCount = options.testFrameCount;
		}
	}

	public testNodeId: number;
	public powerlevel: Powerlevel;
	public testFrameCount: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.testNodeId, this.powerlevel, 0, 0]);
		this.payload.writeUInt16BE(this.testFrameCount, 2);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"test node id": this.testNodeId,
				"power level": getEnumMemberName(Powerlevel, this.powerlevel),
				"test frame count": this.testFrameCount,
			},
		};
	}
}

@CCCommand(PowerlevelCommand.TestNodeReport)
export class PowerlevelCCTestNodeReport extends PowerlevelCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 4);
		this.testNodeId = this.payload[0];
		this.status = this.payload[1];
		this.acknowledgedFrames = this.payload.readUInt16BE(2);
	}

	public readonly testNodeId: number;
	public readonly status: PowerlevelTestStatus;
	public readonly acknowledgedFrames: number;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
