import { clamp } from "alcalzone-shared/math";
import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
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
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum ColorSwitchCommand {
	SupportedGet = 0x01,
	SupportedReport = 0x02,
	Get = 0x03,
	Report = 0x04,
	Set = 0x05,
}

export enum ColorComponent {
	WarmWhite = 0,
	ColdWhite = 1,
	Red = 2,
	Green = 3,
	Blue = 4,
	Amber = 5,
	Cyan = 6,
	Purple = 7,
	Index = 8,
}

export interface ColorTable {
	warmWhite?: number;
	coldWhite?: number;
	red?: number;
	green?: number;
	blue?: number;
	amber?: number;
	cyan?: number;
	purple?: number;
	index?: number;
}

const ColorTableComponentMap: Record<keyof ColorTable, ColorComponent> = {
	warmWhite: ColorComponent.WarmWhite,
	coldWhite: ColorComponent.ColdWhite,
	red: ColorComponent.Red,
	green: ColorComponent.Green,
	blue: ColorComponent.Blue,
	amber: ColorComponent.Amber,
	cyan: ColorComponent.Cyan,
	purple: ColorComponent.Purple,
	index: ColorComponent.Index,
};

@API(CommandClasses["Color Switch"])
export class ColorSwitchCCAPI extends CCAPI {
	public supportsCommand(cmd: ColorSwitchCommand): Maybe<boolean> {
		switch (cmd) {
			case ColorSwitchCommand.SupportedGet:
			case ColorSwitchCommand.Get:
			case ColorSwitchCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async supportedGet() {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.SupportedGet,
		);

		const cc = new ColorSwitchCCSupportedGet(this.driver, {
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

	public async get(colorComponent: ColorComponent) {
		this.assertSupportsCommand(ColorSwitchCommand, ColorSwitchCommand.Get);

		const cc = new ColorSwitchCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			colorComponent: colorComponent,
		});
		const response = (await this.driver.sendCommand<ColorSwitchCCReport>(
			cc,
		))!;
		return {
			colorComponent: response.colorComponent,
			value: response.value,
		};
	}

	public async set(colorTable: ColorTable) {
		this.assertSupportsCommand(ColorSwitchCommand, ColorSwitchCommand.Set);

		const cc = new ColorSwitchCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...colorTable,
		});

		// TODO: No response from this?
		await this.driver.sendCommand(cc);
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
export class ColorSwitchCCSupportedGet extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(ColorSwitchCommand.Report)
export class ColorSwitchCCReport extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		// Docs say 'variable length', but the table shows 2 bytes.
		validatePayload(this.payload.length >= 2);
		this._colorComponent = this.payload[0];
		this._value = this.payload[1];

		// TODO: We probably want to store each color value
		//	as a different ccValue.  How do we do that when
		//	we get each color code separately in a single report?
	}

	private _colorComponent: ColorComponent;
	public get colorComponent(): ColorComponent {
		return this._colorComponent;
	}

	private _value: number;
	public get value(): number {
		return this._value;
	}
}

interface ColorSwitchCCGetOptions extends CCCommandOptions {
	colorComponent: ColorComponent;
}

@CCCommand(ColorSwitchCommand.Get)
@expectedCCResponse(ColorSwitchCCReport)
export class ColorSwitchCCGet extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | ColorSwitchCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			// Populate properties from options object
			this._colorComponent = options.colorComponent;
		}
	}

	private _colorComponent: ColorComponent;
	public get colorComponent(): ColorComponent {
		return this._colorComponent;
	}
	public set colorComponent(value: ColorComponent) {
		if (!ColorComponent[value]) {
			throw new Error(
				"colorComponent must be a valid color component index.",
			);
		}
		this._colorComponent = value;
	}

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(1);
		this.payload[0] = this._colorComponent;
		return super.serialize();
	}
}

export type ColorSwitchCCSetOptions = CCCommandOptions & ColorTable;

// TODO: What does this return?  Does it not have an expected response?
@CCCommand(ColorSwitchCommand.Get)
export class ColorSwitchCCSet extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | ColorSwitchCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			// Populate properties from options object
			this._colorTable = {
				warmWhite: options.warmWhite,
				coldWhite: options.coldWhite,
				red: options.red,
				green: options.green,
				blue: options.blue,
				cyan: options.cyan,
				purple: options.purple,
			};
		}
	}

	private _colorTable: ColorTable;
	public get colorTable(): ColorTable {
		return this._colorTable;
	}

	public set colorTable(value: ColorTable) {
		this._colorTable = {
			warmWhite: value.warmWhite,
			coldWhite: value.coldWhite,
			red: value.red,
			green: value.green,
			blue: value.blue,
			cyan: value.cyan,
			purple: value.purple,
		};
	}

	public serialize(): Buffer {
		let colorComponentKeys = Object.keys(
			this._colorTable,
		) as (keyof ColorTable)[];
		colorComponentKeys = colorComponentKeys.filter(
			(x) => !isNaN(this._colorTable[x] as any),
		);
		const colorComponentCount = colorComponentKeys.length;
		this.payload = Buffer.allocUnsafe(1 + colorComponentCount * 2);
		this.payload[0] = colorComponentCount & 31;
		let i = 1;
		for (const key of colorComponentKeys) {
			const value = this._colorTable[key];
			const component = ColorTableComponentMap[key];
			this.payload[i] = component;
			this.payload[i + 1] = clamp(value!, 0, 0xff);
			i += 2;
		}
		return super.serialize();
	}
}
