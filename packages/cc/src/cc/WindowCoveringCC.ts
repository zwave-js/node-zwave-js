import {
	CommandClasses,
	Duration,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { CCAPI } from "../lib/API";
import {
	CCCommandOptions,
	CommandClass,
	gotDeserializationOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { WindowCoveringCommand, WindowCoveringParameter } from "../lib/_Types";

// TODO: Move this enumeration into the src/lib/_Types.ts file
// All additional type definitions (except CC constructor options) must be defined there too
export const WindowCoveringCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Window Covering"], {
		...V.staticProperty(
			"supportedParameters",
			undefined, // meta
			{ internal: true }, // value options
		),
	}),

	...V.defineDynamicCCValues(CommandClasses["Window Covering"], {
		// Dynamic CC values go here
	}),
});

@API(CommandClasses["Window Covering"])
export class WindowCoveringCCAPI extends CCAPI {
	// TODO: Implementation
}

@commandClass(CommandClasses["Window Covering"])
@implementedVersion(1)
@ccValues(WindowCoveringCCValues)
export class WindowCoveringCC extends CommandClass {
	declare ccCommand: WindowCoveringCommand;
}

@CCCommand(WindowCoveringCommand.SupportedReport)
export class WindowCoveringCCSupportedReport extends WindowCoveringCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);

		const numBitmaskBytes = this.payload[0] & 0b1111;
		validatePayload(this.payload.length >= 1 + numBitmaskBytes);
		const bitmask = this.payload.slice(1, 1 + numBitmaskBytes);

		this.supportedParameters = parseBitMask(
			bitmask,
			WindowCoveringParameter["Outbound Left (no position)"],
		);
	}

	@ccValue(WindowCoveringCCValues.supportedParameters)
	public readonly supportedParameters: readonly WindowCoveringCommand[];
}

@CCCommand(WindowCoveringCommand.SupportedGet)
@expectedCCResponse(WindowCoveringCCSupportedReport)
export class WindowCoveringCCSupportedGet extends WindowCoveringCC {}

@CCCommand(WindowCoveringCommand.Report)
export class WindowCoveringCCReport extends WindowCoveringCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 4);
		this.parameter = this.payload[0];
		this.currentValue = this.payload[1];
		this.targetValue = this.payload[2];
		this.duration =
			Duration.parseReport(this.payload[3]) ?? Duration.unknown();
	}

	public readonly parameter: WindowCoveringParameter;
	public readonly currentValue: number;
	public readonly targetValue: number;
	public readonly duration: Duration;
}

interface WindowCoveringCCGetOptions extends CCCommandOptions {
	parameter: WindowCoveringParameter;
}

function testResponseForWindowCoveringGet(
	sent: WindowCoveringCCGet,
	received: WindowCoveringCCReport,
) {
	return received.parameter === sent.parameter;
}

@CCCommand(WindowCoveringCommand.Get)
@expectedCCResponse(WindowCoveringCCReport, testResponseForWindowCoveringGet)
export class WindowCoveringCCGet extends WindowCoveringCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| WindowCoveringCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.parameter = this.payload[0];
		} else {
			this.parameter = options.parameter;
		}
	}

	public parameter: WindowCoveringParameter;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.parameter]);
		return super.serialize();
	}
}
