import { IDriver } from "../driver/IDriver";
import { validatePayload } from "../util/misc";
import { Duration } from "../values/Duration";
import { ValueMetadata } from "../values/Metadata";
import { Maybe } from "../values/Primitive";
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
import { CommandClasses } from "./CommandClasses";

// @noInterview This CC is write-only

// All the supported commands
export enum SceneActivationCommand {
	Set = 0x01,
}

@API(CommandClasses["Scene Activation"])
export class SceneActivationCCAPI extends CCAPI {
	public supportsCommand(cmd: SceneActivationCommand): Maybe<boolean> {
		switch (cmd) {
			case SceneActivationCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
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

	public async set(
		sceneId: number,
		dimmingDuration?: Duration,
	): Promise<void> {
		this.assertSupportsCommand(
			SceneActivationCommand,
			SceneActivationCommand.Set,
		);

		const cc = new SceneActivationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId,
			dimmingDuration,
		});
		await this.driver.sendCommand(cc);
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
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| SceneActivationCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			this.sceneId = this.payload[0];
			validatePayload(this.sceneId >= 1, this.sceneId <= 255);
			this.dimmingDuration = Duration.parseSet(this.payload[1]);
		} else {
			this.sceneId = options.sceneId;
			this.dimmingDuration = options.dimmingDuration;
		}
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		min: 1,
		label: "Scene ID",
	})
	public sceneId: number;

	@ccValue() public dimmingDuration: Duration | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.sceneId,
			this.dimmingDuration?.serializeSet() ?? 0xff,
		]);
		return super.serialize();
	}
}
