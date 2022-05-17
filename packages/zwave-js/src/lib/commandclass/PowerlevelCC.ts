import {
	CommandClasses,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import { NodeStatus } from "../node/_Types";
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
import { Powerlevel, PowerlevelCommand, PowerlevelTestStatus } from "./_Types";

@API(CommandClasses.Powerlevel)
export class PowerlevelCCAPI extends CCAPI {
	public supportsCommand(cmd: PowerlevelCommand): Maybe<boolean> {
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

	public async setNormalPowerlevel(): Promise<void> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Set);

		const cc = new PowerlevelCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			powerlevel: Powerlevel["Normal Power"],
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async setCustomPowerlevel(
		powerlevel: Powerlevel,
		timeout: number,
	): Promise<void> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Set);

		const cc = new PowerlevelCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			powerlevel,
			timeout,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getPowerlevel(): Promise<
		Pick<PowerlevelCCReport, "powerlevel" | "timeout"> | undefined
	> {
		this.assertSupportsCommand(PowerlevelCommand, PowerlevelCommand.Get);

		const cc = new PowerlevelCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<PowerlevelCCReport>(
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
	): Promise<void> {
		this.assertSupportsCommand(
			PowerlevelCommand,
			PowerlevelCommand.TestNodeSet,
		);

		const cc = new PowerlevelCCTestNodeSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			testNodeId,
			powerlevel,
			testFrameCount,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getNodeTestStatus(): Promise<
		| Pick<
				PowerlevelCCTestNodeReport,
				"testNodeId" | "status" | "acknowledgedFrames"
		  >
		| undefined
	> {
		this.assertSupportsCommand(
			PowerlevelCommand,
			PowerlevelCommand.TestNodeGet,
		);

		const cc = new PowerlevelCCTestNodeGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<PowerlevelCCTestNodeReport>(
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

type PowerlevelCCSetOptions = CCCommandOptions &
	(
		| {
				powerlevel: Powerlevel;
				timeout: number;
		  }
		| {
				powerlevel: typeof Powerlevel["Normal Power"];
				timeout?: undefined;
		  }
	);

@CCCommand(PowerlevelCommand.Set)
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"power level": getEnumMemberName(Powerlevel, this.powerlevel),
		};
		if (this.timeout != undefined) {
			message.timeout = `${this.timeout} s`;
		}
		return {
			...super.toLogEntry(),
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

		this.persistValues();
	}

	public readonly powerlevel: Powerlevel;
	public readonly timeout?: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"power level": getEnumMemberName(Powerlevel, this.powerlevel),
		};
		if (this.timeout != undefined) {
			message.timeout = `${this.timeout} s`;
		}
		return {
			...super.toLogEntry(),
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
			if (options.testNodeId === this.nodeId) {
				throw new ZWaveError(
					`For a powerlevel test, the test node ID must different from the source node ID.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			const testNode = host.nodes.getOrThrow(options.testNodeId);
			if (testNode.isFrequentListening) {
				throw new ZWaveError(
					`Node ${options.testNodeId} is FLiRS and therefore cannot be used for a powerlevel test.`,
					ZWaveErrorCodes.PowerlevelCC_UnsupportedTestNode,
				);
			}
			if (testNode.canSleep && testNode.status !== NodeStatus.Awake) {
				throw new ZWaveError(
					`Node ${options.testNodeId} is not awake and therefore cannot be used for a powerlevel test.`,
					ZWaveErrorCodes.PowerlevelCC_UnsupportedTestNode,
				);
			}

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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
