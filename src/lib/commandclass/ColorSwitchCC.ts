import { Driver } from "../driver/Driver";
import { JSONObject, validatePayload } from "../util/misc";
import { ValueMetadata } from "../values/Metadata";
import type { Maybe } from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	commandClass,
	CommandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum ColorSwitchCommand {
	SupportedGet = 0x01,
	SupportedReport = 0x02,
}

@API(CommandClasses["Color Switch"])
export class ColorSwitchCCAPI extends CCAPI {
	public supportsCommand(cmd: ColorSwitchCommand): Maybe<boolean> {
		switch (cmd) {
			case ColorSwitchCommand.SupportedGet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async supportedGet() {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.SupportedGet,
		);

		const cc = new BinarySwitchCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			ColorSwitchCCSupportedReport
		>(cc))!;
		return {
			supportsWarmWhite: response.supportsWarmWhite,
			supportsColdWhite: response.supportsColdWhite,
			supportsRed: response.supportsRed,
			supportsGreen: response.supportsGreen,
			supportsBlue: response.supportsBlue,
			supportsAmber: response.supportsAmber,
			supportsCyan: response.supportsCyan,
			supportsPurple: response.supportsPurple,
			supportsIndex: response.supportsIndex,
		};
	}
}

@commandClass(CommandClasses["Color Switch"])
@implementedVersion(1) // ColorSwitch is at 3, but implementing 1 for now
export class ColorSwitchCC extends CommandClass {
	declare ccCommand: ColorSwitchCommand;

	// TODO: Interview?
}

@CCCommand(ColorSwitchCommand.SupportedReport)
export class ColorSwitchCCSupportedReport extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		// Docs say 'variable length', but the table shows 2 bytes.
		validatePayload(this.payload.length >= 2);

		// Don't know what order these come in.
		//  Blindly assuming its in order of payload,
		//  but the table seems to be big-endian.
		this._supportsWarmWhite = Boolean(this.payload[0] & 1);
		this._supportsColdWhite = Boolean(this.payload[0] & 2);
		this._supportsRed = Boolean(this.payload[0] & 4);
		this._supportsGreen = Boolean(this.payload[0] & 8);
		this._supportsBlue = Boolean(this.payload[0] & 16);
		this._supportsAmber = Boolean(this.payload[0] & 32);
		this._supportsCyan = Boolean(this.payload[0] & 64);
		this._supportsPurple = Boolean(this.payload[0] & 128);
		this._supportsIndex = Boolean(this.payload[2] & 1);

		//this.persistValues();
	}

	private _supportsWarmWhite: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Supports Warm White",
	})
	public get supportsWarmWhite(): boolean {
		return this._supportsWarmWhite;
	}

	private _supportsColdWhite: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Supports Cold White",
	})
	public get supportsColdWhite(): boolean {
		return this._supportsColdWhite;
	}

	private _supportsRed: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Supports Red",
	})
	public get supportsRed(): boolean {
		return this._supportsRed;
	}

	private _supportsGreen: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Supports Green",
	})
	public get supportsGreen(): boolean {
		return this._supportsGreen;
	}

	private _supportsBlue: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Supports Blue",
	})
	public get supportsBlue(): boolean {
		return this._supportsBlue;
	}

	private _supportsAmber: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Supports Amber",
	})
	public get supportsAmber(): boolean {
		return this._supportsAmber;
	}

	private _supportsCyan: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Supports Cyan",
	})
	public get supportsCyan(): boolean {
		return this._supportsCyan;
	}

	private _supportsPurple: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Supports Purple",
	})
	public get supportsPurple(): boolean {
		return this._supportsPurple;
	}

	private _supportsIndex: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Supports Indexed Color",
	})
	public get supportsIndex(): boolean {
		return this._supportsIndex;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			supportsWarmWhite: this._supportsWarmWhite,
			supportsColdWhite: this._supportsColdWhite,
			supportsRed: this._supportsRed,
			supportsGreen: this._supportsGreen,
			supportsBlue: this._supportsBlue,
			supportsAmber: this._supportsAmber,
			supportsCyan: this._supportsCyan,
			supportsPurple: this._supportsPurple,
			supportsIndex: this._supportsIndex,
		});
	}
}

@CCCommand(ColorSwitchCommand.SupportedGet)
@expectedCCResponse(ColorSwitchCCSupportedReport)
export class BinarySwitchCCGet extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
