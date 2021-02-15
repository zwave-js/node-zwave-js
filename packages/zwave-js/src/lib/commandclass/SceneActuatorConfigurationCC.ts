import {
	CommandClasses,
	Duration,
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
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

// All the supported commands
export enum SceneActuatorConfigurationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@API(CommandClasses["Scene Actuator Configuration"])
export class SceneActuatorConfigurationCCAPI extends CCAPI {
	// TODO: Implementation
}

@commandClass(CommandClasses["Scene Actuator Configuration"])
@implementedVersion(1)
export class SceneActuatorConfigurationCC extends CommandClass {
	declare ccCommand: SceneActuatorConfigurationCommand;
}

interface SceneActuatorConfigurationCCSetOptions extends CCCommandOptions {
	sceneId: number;
	dimmingDuration: Duration;
	override: boolean;
	level: number;
}

@CCCommand(SceneActuatorConfigurationCommand.Set)
export class SceneActuatorConfigurationCCSet extends SceneActuatorConfigurationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SceneActuatorConfigurationCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			// TODO: Populate properties from options object
			throw new Error("not implemented");
		}
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([
			/* TODO: serialize */
		]);
		return super.serialize();
	}
}

@CCCommand(SceneActuatorConfigurationCommand.Report)
export class SceneActuatorConfigurationCCReport extends SceneActuatorConfigurationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		// TODO: Deserialize
	}
}

interface SceneActuatorConfigurationCCGetOptions extends CCCommandOptions {
	sceneId: number;
}

@CCCommand(SceneActuatorConfigurationCommand.Get)
@expectedCCResponse(SceneActuatorConfigurationCCReport)
export class SceneActuatorConfigurationCCGet extends SceneActuatorConfigurationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SceneActuatorConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sceneId = options.sceneId;
		}
	}

	public sceneId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sceneId]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "scene id": this.sceneId },
		};
	}
}
