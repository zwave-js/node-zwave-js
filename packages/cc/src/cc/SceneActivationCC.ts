import type {
	MessageOrCCLogEntry,
	MessageRecord,
	SupervisionResult,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	Duration,
	type MaybeNotKnown,
	ValueMetadata,
	validatePayload,
} from "@zwave-js/core/safe";
import type { ZWaveHost, ZWaveValueHost } from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { SceneActivationCommand } from "../lib/_Types";

export const SceneActivationCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Scene Activation"], {
		...V.staticProperty(
			"sceneId",
			{
				...ValueMetadata.UInt8,
				min: 1,
				label: "Scene ID",
				valueChangeOptions: ["transitionDuration"],
			} as const,
			{ stateful: false },
		),

		...V.staticProperty(
			"dimmingDuration",
			{
				...ValueMetadata.Duration,
				label: "Dimming duration",
			} as const,
		),
	}),
});

// @noInterview This CC is write-only

@API(CommandClasses["Scene Activation"])
export class SceneActivationCCAPI extends CCAPI {
	public supportsCommand(
		_cmd: SceneActivationCommand,
	): MaybeNotKnown<boolean> {
		// There is only one mandatory command
		return true;
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: SceneActivationCCAPI,
			{ property },
			value,
			options,
		) {
			if (property !== "sceneId") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			const duration = Duration.from(options?.transitionDuration);
			return this.set(value, duration);
		};
	}

	/**
	 * Activates the Scene with the given ID
	 * @param duration The duration specifying how long the transition should take. Can be a Duration instance or a user-friendly duration string like `"1m17s"`.
	 */
	@validateArgs()
	public async set(
		sceneId: number,
		dimmingDuration?: Duration | string,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			SceneActivationCommand,
			SceneActivationCommand.Set,
		);

		const cc = new SceneActivationCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sceneId,
			dimmingDuration,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Scene Activation"])
@implementedVersion(1)
@ccValues(SceneActivationCCValues)
export class SceneActivationCC extends CommandClass {
	declare ccCommand: SceneActivationCommand;
}

// @publicAPI
export interface SceneActivationCCSetOptions extends CCCommandOptions {
	sceneId: number;
	dimmingDuration?: Duration | string;
}

@CCCommand(SceneActivationCommand.Set)
@useSupervision()
export class SceneActivationCCSet extends SceneActivationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| SceneActivationCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.sceneId = this.payload[0];
			// Per the specs, dimmingDuration is required, but as always the real world is different...
			if (this.payload.length >= 2) {
				this.dimmingDuration = Duration.parseSet(this.payload[1]);
			}

			validatePayload(this.sceneId >= 1, this.sceneId <= 255);
		} else {
			this.sceneId = options.sceneId;
			this.dimmingDuration = Duration.from(options.dimmingDuration);
		}
	}

	@ccValue(SceneActivationCCValues.sceneId)
	public sceneId: number;

	@ccValue(SceneActivationCCValues.dimmingDuration)
	public dimmingDuration: Duration | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.sceneId,
			this.dimmingDuration?.serializeSet() ?? 0xff,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = { "scene id": this.sceneId };
		if (this.dimmingDuration != undefined) {
			message["dimming duration"] = this.dimmingDuration.toString();
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}
