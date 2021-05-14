import type {
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	Duration,
	validatePayload,
	ValueMetadata,
} from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import {
	CCAPI,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

// @noInterview This CC is write-only

export function getSceneIdValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Scene Activation"],
		endpoint,
		property: "sceneId",
	};
}

export function getDimmingDurationValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Scene Activation"],
		endpoint,
		property: "dimmingDuration",
	};
}

// All the supported commands
export enum SceneActivationCommand {
	Set = 0x01,
}

@API(CommandClasses["Scene Activation"])
export class SceneActivationCCAPI extends CCAPI {
	public supportsCommand(_cmd: SceneActivationCommand): Maybe<boolean> {
		// There is only one mandatory command
		return true;
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "sceneId") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}
		await this.set(value);
	};

	/**
	 * Activates the Scene with the given ID
	 * @param duration The duration specifying how long the transition should take. Can be a Duration instance or a user-friendly duration string like `"1m17s"`.
	 */
	public async set(
		sceneId: number,
		dimmingDuration?: Duration | string,
	): Promise<void> {
		this.assertSupportsCommand(
			SceneActivationCommand,
			SceneActivationCommand.Set,
		);

		const cc = new SceneActivationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId,
			dimmingDuration: Duration.from(dimmingDuration),
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Scene Activation"])
@implementedVersion(1)
export class SceneActivationCC extends CommandClass {
	declare ccCommand: SceneActivationCommand;
}

interface SceneActivationCCSetOptions extends CCCommandOptions {
	sceneId: number;
	dimmingDuration?: Duration;
}

@CCCommand(SceneActivationCommand.Set)
export class SceneActivationCCSet extends SceneActivationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SceneActivationCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.sceneId = this.payload[0];
			this.dimmingDuration = Duration.parseSet(this.payload[1]);

			validatePayload(this.sceneId >= 1, this.sceneId <= 255);
			this.persistValues();
		} else {
			this.sceneId = options.sceneId;
			this.dimmingDuration = options.dimmingDuration;
		}
	}

	@ccValue({ stateful: false })
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		min: 1,
		label: "Scene ID",
	})
	public sceneId: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Any,
		label: "Dimming duration",
	})
	public dimmingDuration: Duration | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.sceneId,
			this.dimmingDuration?.serializeSet() ?? 0xff,
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = { "scene id": this.sceneId };
		if (this.dimmingDuration != undefined) {
			message["dimming duration"] = this.dimmingDuration.toString();
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
