import {
	CommandClasses,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	MessageRecord,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import { clamp } from "alcalzone-shared/math";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import {
	API,
	CCCommand,
	ccValue,
	ccValueMetadata,
	commandClass,
	CommandClass,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CCResponsePredicate,
	type CommandClassDeserializationOptions,
} from "./CommandClass";
import { SoundSwitchCommand, ToneId } from "./_Types";

export function getVolumeValueId(endpointIndex: number | undefined): ValueID {
	return {
		commandClass: CommandClasses["Sound Switch"],
		endpoint: endpointIndex,
		property: "volume",
	};
}

export function getToneIdValueId(endpointIndex: number | undefined): ValueID {
	return {
		commandClass: CommandClasses["Sound Switch"],
		endpoint: endpointIndex,
		property: "toneId",
	};
}

@API(CommandClasses["Sound Switch"])
export class SoundSwitchCCAPI extends CCAPI {
	public supportsCommand(cmd: SoundSwitchCommand): Maybe<boolean> {
		switch (cmd) {
			case SoundSwitchCommand.TonesNumberGet:
			case SoundSwitchCommand.ToneInfoGet:
			case SoundSwitchCommand.ConfigurationGet:
			case SoundSwitchCommand.TonePlayGet:
				return this.isSinglecast();
			case SoundSwitchCommand.ConfigurationSet:
			case SoundSwitchCommand.TonePlaySet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async getToneCount(): Promise<number | undefined> {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.TonesNumberGet,
		);

		const cc = new SoundSwitchCCTonesNumberGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<SoundSwitchCCTonesNumberReport>(
				cc,
				this.commandOptions,
			);
		return response?.toneCount;
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getToneInfo(toneId: number) {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.ToneInfoGet,
		);

		const cc = new SoundSwitchCCToneInfoGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			toneId,
		});
		const response =
			await this.applHost.sendCommand<SoundSwitchCCToneInfoReport>(
				cc,
				this.commandOptions,
			);
		if (response) return pick(response, ["duration", "name"]);
	}

	@validateArgs()
	public async setConfiguration(
		defaultToneId: number,
		defaultVolume: number,
	): Promise<void> {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.ConfigurationSet,
		);

		const cc = new SoundSwitchCCConfigurationSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			defaultToneId,
			defaultVolume,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getConfiguration() {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.ConfigurationGet,
		);

		const cc = new SoundSwitchCCConfigurationGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<SoundSwitchCCConfigurationReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, ["defaultToneId", "defaultVolume"]);
		}
	}

	@validateArgs()
	public async play(toneId: number, volume?: number): Promise<void> {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.TonePlaySet,
		);

		if (toneId === 0) {
			throw new ZWaveError(
				`Tone ID must be > 0. Use stopPlaying to stop the tone.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new SoundSwitchCCTonePlaySet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			toneId,
			volume,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async stopPlaying(): Promise<void> {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.TonePlaySet,
		);

		const cc = new SoundSwitchCCTonePlaySet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			toneId: 0x00,
			volume: 0x00,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getPlaying() {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.TonePlayGet,
		);

		const cc = new SoundSwitchCCTonePlayGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<SoundSwitchCCTonePlayReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, ["toneId", "volume"]);
		}
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
		options,
	): Promise<void> => {
		if (property === "defaultToneId") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			await this.setConfiguration(value, 0xff /* keep current volume */);
		} else if (property === "defaultVolume") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			await this.setConfiguration(0x00 /* keep current tone */, value);
		} else if (property === "toneId") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			if (value > 0) {
				// Use provided volume or try to use the current volume if it exists
				const volume =
					options?.volume !== undefined
						? options.volume
						: this.tryGetValueDB()?.getValue<number>(
								getVolumeValueId(this.endpoint.index),
						  );
				await this.play(value, volume);
			} else {
				await this.stopPlaying();
			}
			if (this.isSinglecast()) {
				// Verify the current value after a (short) delay
				this.schedulePoll({ property }, value, { transition: "fast" });
			}
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "defaultToneId":
			case "defaultVolume":
				return (await this.getConfiguration())?.[property];

			case "toneId":
			case "volume":
				return (await this.getPlaying())?.[property];

			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};
}

@commandClass(CommandClasses["Sound Switch"])
@implementedVersion(2)
export class SoundSwitchCC extends CommandClass {
	declare ccCommand: SoundSwitchCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Sound Switch"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB(applHost);

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		applHost.controllerLog.logNode(node.id, {
			message: "requesting current sound configuration...",
			direction: "outbound",
		});
		const config = await api.getConfiguration();
		if (config) {
			const logMessage = `received current sound configuration:
default tone ID: ${config.defaultToneId}
default volume: ${config.defaultVolume}`;
			applHost.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}

		applHost.controllerLog.logNode(node.id, {
			message: "requesting tone count...",
			direction: "outbound",
		});
		const toneCount = await api.getToneCount();
		if (toneCount != undefined) {
			const logMessage = `supports ${toneCount} tones`;
			applHost.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		} else {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "Querying tone count timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		const metadataStates: Record<number, string> = {
			0: "off",
		};
		for (let toneId = 1; toneId <= toneCount; toneId++) {
			applHost.controllerLog.logNode(node.id, {
				message: `requesting info for tone #${toneId}`,
				direction: "outbound",
			});
			const info = await api.getToneInfo(toneId);
			if (!info) continue;
			const logMessage = `received info for tone #${toneId}:
name:     ${info.name}
duration: ${info.duration} seconds`;
			applHost.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
			metadataStates[toneId] = `${info.name} (${info.duration} sec)`;
		}
		metadataStates[0xff] = "default";

		// Store tone count and info as a single metadata
		valueDB.setMetadata(getToneIdValueId(this.endpointIndex), {
			...ValueMetadata.Number,
			min: 0,
			max: toneCount,
			states: metadataStates,
			label: "Play Tone",
		});

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}
}

@CCCommand(SoundSwitchCommand.TonesNumberReport)
export class SoundSwitchCCTonesNumberReport extends SoundSwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.toneCount = this.payload[0];
	}

	public readonly toneCount: number;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "# of tones": this.toneCount },
		};
	}
}

@CCCommand(SoundSwitchCommand.TonesNumberGet)
@expectedCCResponse(SoundSwitchCCTonesNumberReport)
export class SoundSwitchCCTonesNumberGet extends SoundSwitchCC {}

@CCCommand(SoundSwitchCommand.ToneInfoReport)
export class SoundSwitchCCToneInfoReport extends SoundSwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 4);
		this.toneId = this.payload[0];
		this.duration = this.payload.readUInt16BE(1);
		const nameLength = this.payload[3];
		validatePayload(this.payload.length >= 4 + nameLength);
		this.name = this.payload.slice(4, 4 + nameLength).toString("utf8");
	}

	public readonly toneId: number;
	public readonly duration: number;
	public readonly name: string;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"tone id": this.toneId,
				duration: `${this.duration} seconds`,
				name: this.name,
			},
		};
	}
}

const testResponseForSoundSwitchToneInfoGet: CCResponsePredicate<
	SoundSwitchCCToneInfoGet,
	SoundSwitchCCToneInfoReport
> = (sent, received) => {
	return received.toneId === sent.toneId;
};

interface SoundSwitchCCToneInfoGetOptions extends CCCommandOptions {
	toneId: number;
}

@CCCommand(SoundSwitchCommand.ToneInfoGet)
@expectedCCResponse(
	SoundSwitchCCToneInfoReport,
	testResponseForSoundSwitchToneInfoGet,
)
export class SoundSwitchCCToneInfoGet extends SoundSwitchCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| SoundSwitchCCToneInfoGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.toneId = options.toneId;
		}
	}

	public toneId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.toneId]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "tone id": this.toneId },
		};
	}
}

interface SoundSwitchCCConfigurationSetOptions extends CCCommandOptions {
	defaultVolume: number;
	defaultToneId: number;
}

@CCCommand(SoundSwitchCommand.ConfigurationSet)
export class SoundSwitchCCConfigurationSet extends SoundSwitchCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| SoundSwitchCCConfigurationSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.defaultVolume = options.defaultVolume;
			this.defaultToneId = options.defaultToneId;
		}
	}

	public defaultVolume: number;
	public defaultToneId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.defaultVolume, this.defaultToneId]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"default volume": `${this.defaultVolume} %`,
				"default tone id": this.defaultToneId,
			},
		};
	}
}

@CCCommand(SoundSwitchCommand.ConfigurationReport)
export class SoundSwitchCCConfigurationReport extends SoundSwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);
		this.defaultVolume = clamp(this.payload[0], 0, 100);
		this.defaultToneId = this.payload[1];
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Number,
		min: 0,
		max: 100,
		unit: "%",
		label: "Default volume",
	})
	public readonly defaultVolume: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Number,
		min: 0,
		max: 254,
		label: "Default tone ID",
	})
	public readonly defaultToneId: number;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"default volume": `${this.defaultVolume} %`,
				"default tone id": this.defaultToneId,
			},
		};
	}
}

@CCCommand(SoundSwitchCommand.ConfigurationGet)
@expectedCCResponse(SoundSwitchCCConfigurationReport)
export class SoundSwitchCCConfigurationGet extends SoundSwitchCC {}

interface SoundSwitchCCTonePlaySetOptions extends CCCommandOptions {
	toneId: ToneId | number;
	// V2+
	volume?: number;
}

@CCCommand(SoundSwitchCommand.TonePlaySet)
export class SoundSwitchCCTonePlaySet extends SoundSwitchCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| SoundSwitchCCTonePlaySetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.toneId = options.toneId;
			this.volume = options.volume;
		}
	}

	public toneId: ToneId | number;
	public volume?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.toneId]);
		if (this.version >= 2 && this.volume != undefined) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([this.volume]),
			]);
		}
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"tone id": this.toneId,
		};
		if (this.volume != undefined) {
			message.volume = this.volume === 0 ? "default" : `${this.volume} %`;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(SoundSwitchCommand.TonePlayReport)
export class SoundSwitchCCTonePlayReport extends SoundSwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.toneId = this.payload[0];
		if (this.toneId !== 0 && this.payload.length >= 2) {
			this.volume = this.payload[1];
		}
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		label: "Tone ID",
		valueChangeOptions: ["volume"],
	})
	public readonly toneId: ToneId | number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		min: 0,
		max: 100,
		unit: "%",
		label: "Volume",
		states: {
			0: "default",
		},
	})
	public volume?: number;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"tone id": this.toneId,
		};
		if (this.volume != undefined) {
			message.volume = this.volume === 0 ? "default" : `${this.volume} %`;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(SoundSwitchCommand.TonePlayGet)
@expectedCCResponse(SoundSwitchCCTonePlayReport)
export class SoundSwitchCCTonePlayGet extends SoundSwitchCC {}
