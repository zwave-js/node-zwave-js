import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	Duration,
	Maybe,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, keysOf, pick } from "@zwave-js/shared";
import { clamp } from "alcalzone-shared/math";
import { entries } from "alcalzone-shared/objects";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	CCAPI,
	ignoreTimeout,
	SetValueImplementation,
	SET_VALUE,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "./API";
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
import { LevelChangeDirection } from "./MultilevelSwitchCC";

// All the supported commands
export enum ColorSwitchCommand {
	SupportedGet = 0x01,
	SupportedReport = 0x02,
	Get = 0x03,
	Report = 0x04,
	Set = 0x05,
	StartLevelChange = 0x06,
	StopLevelChange = 0x07,
}

/**
 * @publicAPI
 */
export enum ColorComponent {
	"Warm White" = 0,
	"Cold White",
	Red,
	Green,
	Blue,
	Amber,
	Cyan,
	Purple,
	Index,
}

const ColorComponentMap = {
	warmWhite: ColorComponent["Warm White"],
	coldWhite: ColorComponent["Cold White"],
	red: ColorComponent.Red,
	green: ColorComponent.Green,
	blue: ColorComponent.Blue,
	amber: ColorComponent.Amber,
	cyan: ColorComponent.Cyan,
	purple: ColorComponent.Purple,
	index: ColorComponent.Index,
};
type ColorKey = keyof typeof ColorComponentMap;

// Accept both the kebabCase names and numeric components as table keys
/**
 * @publicAPI
 */
export type ColorTable =
	| Partial<Record<ColorKey, number>>
	| Partial<Record<ColorComponent, number>>;

const colorTableKeys = [
	...keysOf(ColorComponent),
	...keysOf(ColorComponentMap),
];

function colorTableKeyToComponent(key: string): ColorComponent {
	if (/^\d+$/.test(key)) {
		return parseInt(key, 10);
	} else if (key in ColorComponentMap) {
		return (ColorComponentMap as any)[key];
	} else if (key in ColorComponent) {
		return (ColorComponent as any)[key];
	}
	throw new ZWaveError(
		`Invalid color key ${key}!`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

function getSupportedColorComponentsValueID(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Color Switch"],
		endpoint: endpointIndex,
		property: "supportedColorComponents",
	};
}

function getCurrentColorValueID(
	endpointIndex: number,
	component: ColorComponent,
): ValueID {
	return {
		commandClass: CommandClasses["Color Switch"],
		property: "currentColor",
		endpoint: endpointIndex,
		propertyKey: component,
	};
}

function getTargetColorValueID(
	endpointIndex: number,
	component: ColorComponent,
): ValueID {
	return {
		commandClass: CommandClasses["Color Switch"],
		property: "targetColor",
		endpoint: endpointIndex,
		propertyKey: component,
	};
}

@API(CommandClasses["Color Switch"])
export class ColorSwitchCCAPI extends CCAPI {
	public supportsCommand(cmd: ColorSwitchCommand): Maybe<boolean> {
		switch (cmd) {
			case ColorSwitchCommand.SupportedGet:
			case ColorSwitchCommand.Get:
				return this.isSinglecast();
			case ColorSwitchCommand.Set:
			case ColorSwitchCommand.StartLevelChange:
			case ColorSwitchCommand.StopLevelChange:
				return true; // These are mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async getSupported(): Promise<readonly ColorComponent[]> {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.SupportedGet,
		);

		const cc = new ColorSwitchCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<ColorSwitchCCSupportedReport>(
			cc,
			this.commandOptions,
		))!;
		return response.supportedColorComponents;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(component: ColorComponent) {
		this.assertSupportsCommand(ColorSwitchCommand, ColorSwitchCommand.Get);

		const cc = new ColorSwitchCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			colorComponent: component,
		});
		const response = (await this.driver.sendCommand<ColorSwitchCCReport>(
			cc,
			this.commandOptions,
		))!;
		return {
			currentValue: response.currentValue,
			targetValue: response.targetValue,
			duration: response.duration,
		};
	}

	public async set(options: ColorSwitchCCSetOptions): Promise<void> {
		this.assertSupportsCommand(ColorSwitchCommand, ColorSwitchCommand.Set);

		const cc = new ColorSwitchCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async startLevelChange(
		options: ColorSwitchCCStartLevelChangeOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.StartLevelChange,
		);

		const cc = new ColorSwitchCCStartLevelChange(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async stopLevelChange(
		colorComponent: ColorComponent,
	): Promise<void> {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.StopLevelChange,
		);

		const cc = new ColorSwitchCCStopLevelChange(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			colorComponent,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	) => {
		if (property !== "targetColor") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}

		if (propertyKey == undefined) {
			// Might want to treat keyless value as hex "#wwccrrggbb"
			throwMissingPropertyKey(this.ccId, property);
		} else if (typeof propertyKey !== "number") {
			throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
		}

		await this.set({ [propertyKey]: value });

		if (this.isSinglecast()) {
			// Refresh the current value
			await this.get(propertyKey);
		}
	};
}

@commandClass(CommandClasses["Color Switch"])
@implementedVersion(3)
export class ColorSwitchCC extends CommandClass {
	declare ccCommand: ColorSwitchCommand;

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Color Switch"].withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB();

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		let supportedColors: readonly ColorComponent[];
		if (complete) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying Color Switch CC supported colors...",
				direction: "outbound",
			});
			supportedColors = await api.getSupported();
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `received supported colors:${supportedColors
					.map((c) => `\n· ${getEnumMemberName(ColorComponent, c)}`)
					.join("")}`,
				direction: "outbound",
			});

			// Create metadata
			for (const color of supportedColors) {
				const colorName = getEnumMemberName(ColorComponent, color);
				valueDB.setMetadata(
					getCurrentColorValueID(this.endpointIndex, color),
					{
						...ValueMetadata.ReadOnlyUInt8,
						label: `Current value (${colorName})`,
						description: `The current value of the ${colorName} color.`,
					},
				);
				valueDB.setMetadata(
					getTargetColorValueID(this.endpointIndex, color),
					{
						...ValueMetadata.UInt8,
						label: `Target value (${colorName})`,
						description: `The target value of the ${colorName} color.`,
					},
				);
			}
		} else {
			supportedColors = valueDB.getValue<ColorComponent[]>(
				getSupportedColorComponentsValueID(this.endpointIndex),
			)!;
		}

		for (const color of supportedColors) {
			await ignoreTimeout(
				async () => {
					const colorName = getEnumMemberName(ColorComponent, color);
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying current color state (${colorName})`,
						direction: "outbound",
					});
					await api.get(color);
				},
				() => {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `Current color query timed out - skipping because it is not critical...`,
						level: "warn",
					});
				},
			);
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public translatePropertyKey(
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (
			(property === "currentColor" || property === "targetColor") &&
			typeof propertyKey === "number"
		) {
			const translated = ColorComponent[propertyKey];
			if (translated) return translated;
		}
		return super.translatePropertyKey(property, propertyKey);
	}
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

		this.supportedColorComponents = parseBitMask(
			this.payload.slice(0, 2),
			ColorComponent["Warm White"],
		);

		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly supportedColorComponents: readonly ColorComponent[];

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported color components": this.supportedColorComponents
					.map((c) => `\n· ${getEnumMemberName(ColorComponent, c)}`)
					.join(""),
			},
		};
	}
}

@CCCommand(ColorSwitchCommand.SupportedGet)
@expectedCCResponse(ColorSwitchCCSupportedReport)
export class ColorSwitchCCSupportedGet extends ColorSwitchCC {}

@CCCommand(ColorSwitchCommand.Report)
export class ColorSwitchCCReport extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this.colorComponent = this.payload[0];
		this.currentValue = this.payload[1];

		if (this.version >= 3 && this.payload.length >= 4) {
			this.targetValue = this.payload[2];
			this.duration = Duration.parseReport(this.payload[3]);
		}

		const valueDB = this.getValueDB();

		const valueId = getCurrentColorValueID(
			this.endpointIndex,
			this.colorComponent,
		);
		valueDB.setValue(valueId, this.currentValue);

		if (this.targetValue != undefined) {
			const targetValueId = getTargetColorValueID(
				this.endpointIndex,
				this.colorComponent,
			);
			valueDB.setValue(targetValueId, this.targetValue);
		}

		// For duration, which is stored globally instead of per component
		this.persistValues();
	}

	public readonly colorComponent: ColorComponent;
	public readonly currentValue: number;
	public readonly targetValue: number | undefined;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Duration,
		label: "Transition duration",
	})
	public readonly duration: Duration | undefined;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"color component": getEnumMemberName(
				ColorComponent,
				this.colorComponent,
			),
			"current value": this.currentValue,
		};
		if (this.targetValue != undefined) {
			message["target value"] = this.targetValue;
		}
		if (this.duration != undefined) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

interface ColorSwitchCCGetOptions extends CCCommandOptions {
	colorComponent: ColorComponent;
}

function testResponseForColorSwitchGet(
	sent: ColorSwitchCCGet,
	received: ColorSwitchCCReport,
) {
	return sent.colorComponent === received.colorComponent;
}

@CCCommand(ColorSwitchCommand.Get)
@expectedCCResponse(ColorSwitchCCReport, testResponseForColorSwitchGet)
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
			this._colorComponent = options.colorComponent;
		}
	}

	private _colorComponent: ColorComponent;
	public get colorComponent(): ColorComponent {
		return this._colorComponent;
	}
	public set colorComponent(value: ColorComponent) {
		if (!ColorComponent[value]) {
			throw new ZWaveError(
				"colorComponent must be a valid color component index.",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this._colorComponent = value;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([this._colorComponent]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"color component": getEnumMemberName(
					ColorComponent,
					this.colorComponent,
				),
			},
		};
	}
}

export type ColorSwitchCCSetOptions = ColorTable & {
	duration?: Duration;
};

@CCCommand(ColorSwitchCommand.Set)
export class ColorSwitchCCSet extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & ColorSwitchCCSetOptions),
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
			this.colorTable = pick(options, colorTableKeys as any[]);
			this.duration = options.duration;
		}
	}

	public colorTable: ColorTable;
	public duration: Duration | undefined;

	public serialize(): Buffer {
		const populatedColorCount = Object.keys(this.colorTable).length;
		this.payload = Buffer.allocUnsafe(
			1 + populatedColorCount * 2 + (this.version >= 2 ? 1 : 0),
		);
		this.payload[0] = populatedColorCount & 0b11111;
		let i = 1;
		for (const [key, value] of entries(this.colorTable)) {
			const component = colorTableKeyToComponent(key);
			this.payload[i] = component;
			this.payload[i + 1] = clamp(value!, 0, 0xff);
			i += 2;
		}
		if (this.version >= 2 && this.duration) {
			this.payload[i] = this.duration.serializeSet();
		}
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		for (const [key, value] of Object.entries(this.colorTable)) {
			if (value == undefined) continue;
			const realKey: string =
				key in ColorComponentMap
					? (ColorComponent as any)[(ColorComponentMap as any)[key]]
					: (ColorComponent as any)[key];
			message[realKey] = value;
		}
		if (this.duration != undefined) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

type ColorSwitchCCStartLevelChangeOptions = {
	colorComponent: ColorComponent;
	direction: keyof typeof LevelChangeDirection;
} & (
	| {
			ignoreStartLevel: true;
			startLevel?: number;
	  }
	| {
			ignoreStartLevel: false;
			startLevel: number;
	  }
) & {
		// Version >= 3:
		duration?: Duration;
	};

@CCCommand(ColorSwitchCommand.StartLevelChange)
export class ColorSwitchCCStartLevelChange extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & ColorSwitchCCStartLevelChangeOptions),
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.duration = options.duration;
			this.ignoreStartLevel = options.ignoreStartLevel;
			this.startLevel = options.startLevel ?? 0;
			this.direction = options.direction;
			this.colorComponent = options.colorComponent;
		}
	}

	public duration: Duration | undefined;
	public startLevel: number;
	public ignoreStartLevel: boolean;
	public direction: keyof typeof LevelChangeDirection;
	public colorComponent: ColorComponent;

	public serialize(): Buffer {
		const controlByte =
			(LevelChangeDirection[this.direction] << 6) |
			(this.ignoreStartLevel ? 0b0010_0000 : 0);
		const payload = [controlByte, this.colorComponent, this.startLevel];

		if (this.version >= 3 && this.duration) {
			payload.push(this.duration.serializeSet());
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"color component": getEnumMemberName(
				ColorComponent,
				this.colorComponent,
			),
			"start level": `${this.startLevel}${
				this.ignoreStartLevel ? " (ignored)" : ""
			}`,
			direction: this.direction,
		};
		if (this.duration != undefined) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

export interface ColorSwitchCCStopLevelChangeOptions extends CCCommandOptions {
	colorComponent: ColorComponent;
}

@CCCommand(ColorSwitchCommand.StopLevelChange)
export class ColorSwitchCCStopLevelChange extends ColorSwitchCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| ColorSwitchCCStopLevelChangeOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.colorComponent = options.colorComponent;
		}
	}

	public readonly colorComponent: ColorComponent;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.colorComponent]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"color component": getEnumMemberName(
					ColorComponent,
					this.colorComponent,
				),
			},
		};
	}
}
