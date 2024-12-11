import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import type {
	GetValueDB,
	MessageOrCCLogEntry,
	MessageRecord,
	SupervisionResult,
	WithAddress,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	Duration,
	type MaybeNotKnown,
	ValueMetadata,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API.js";
import { type CCRaw, CommandClass } from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import { SceneActivationCommand } from "../lib/_Types.js";

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

		const cc = new SceneActivationCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			sceneId,
			dimmingDuration,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Scene Activation"])
@implementedVersion(1)
@ccValues(SceneActivationCCValues)
export class SceneActivationCC extends CommandClass {
	declare ccCommand: SceneActivationCommand;
}

// @publicAPI
export interface SceneActivationCCSetOptions {
	sceneId: number;
	dimmingDuration?: Duration | string;
}

@CCCommand(SceneActivationCommand.Set)
@useSupervision()
@ccValueProperty("sceneId", SceneActivationCCValues.sceneId)
@ccValueProperty("dimmingDuration", SceneActivationCCValues.dimmingDuration)
export class SceneActivationCCSet extends SceneActivationCC {
	public constructor(
		options: WithAddress<SceneActivationCCSetOptions>,
	) {
		super(options);
		this.sceneId = options.sceneId;
		this.dimmingDuration = Duration.from(options.dimmingDuration);
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SceneActivationCCSet {
		validatePayload(raw.payload.length >= 1);
		const sceneId = raw.payload[0];
		validatePayload(sceneId >= 1, sceneId <= 255);

		// Per the specs, dimmingDuration is required, but as always the real world is different...
		let dimmingDuration: Duration | undefined;
		if (raw.payload.length >= 2) {
			dimmingDuration = Duration.parseSet(raw.payload[1]);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			sceneId,
			dimmingDuration,
		});
	}

	public sceneId: number;

	public dimmingDuration: Duration | undefined;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([
			this.sceneId,
			this.dimmingDuration?.serializeSet() ?? 0xff,
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = { "scene id": this.sceneId };
		if (this.dimmingDuration != undefined) {
			message["dimming duration"] = this.dimmingDuration.toString();
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}
