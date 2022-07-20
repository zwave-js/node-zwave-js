import {
	CommandClasses,
	Duration,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	MessageRecord,
	parseBitMask,
	validatePayload,
	ValueDB,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName, keysOf, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { clamp } from "alcalzone-shared/math";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	ccValue,
	ccValueMetadata,
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
	type CommandClassOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import {
	ColorComponent,
	ColorComponentMap,
	ColorKey,
	ColorSwitchCommand,
	ColorTable,
	LevelChangeDirection,
} from "../lib/_Types";

const hexColorRegex =
	/^#?(?<red>[0-9a-f]{2})(?<green>[0-9a-f]{2})(?<blue>[0-9a-f]{2})$/i;

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

function colorComponentToTableKey(
	component: ColorComponent,
): ColorKey | undefined {
	for (const [key, comp] of Object.entries(ColorComponentMap)) {
		if (comp === component) return key as any;
	}
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
	component?: ColorComponent,
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
	component?: ColorComponent,
): ValueID {
	return {
		commandClass: CommandClasses["Color Switch"],
		property: "targetColor",
		endpoint: endpointIndex,
		propertyKey: component,
	};
}

function getSupportsHexColorValueID(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Color Switch"],
		property: "supportsHexColor",
		endpoint: endpointIndex,
	};
}

function getHexColorValueID(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Color Switch"],
		property: "hexColor",
		endpoint: endpointIndex,
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

	public async getSupported(): Promise<
		readonly ColorComponent[] | undefined
	> {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.SupportedGet,
		);

		const cc = new ColorSwitchCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<ColorSwitchCCSupportedReport>(
				cc,
				this.commandOptions,
			);
		return response?.supportedColorComponents;
	}

	@validateArgs({ strictEnums: true })
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(component: ColorComponent) {
		this.assertSupportsCommand(ColorSwitchCommand, ColorSwitchCommand.Get);

		const cc = new ColorSwitchCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			colorComponent: component,
		});
		const response = await this.applHost.sendCommand<ColorSwitchCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["currentValue", "targetValue", "duration"]);
		}
	}

	@validateArgs()
	public async set(options: ColorSwitchCCSetOptions): Promise<void> {
		this.assertSupportsCommand(ColorSwitchCommand, ColorSwitchCommand.Set);

		const cc = new ColorSwitchCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		await this.applHost.sendCommand(cc, this.commandOptions);

		// If the command did not fail, assume that it succeeded and update the values accordingly
		// TODO: The API methods should not modify the value DB directly, but to do so
		// this requires a nicer way of synchronizing hexColor with the others
		if (this.isSinglecast()) {
			// Update each color component separately and record the changes to the compound value
			this.updateCurrentColor(this.getValueDB(), cc.colorTable);
		} else if (this.isMulticast()) {
			// Figure out which nodes were affected by this command
			const affectedNodes = this.endpoint.node.physicalNodes.filter(
				(node) =>
					node
						.getEndpoint(this.endpoint.index)
						?.supportsCC(this.ccId),
			);
			// and optimistically update the currentColor
			for (const node of affectedNodes) {
				const valueDB = this.applHost.tryGetValueDB(node.id);
				if (valueDB) {
					this.updateCurrentColor(valueDB, cc.colorTable);
				}
			}
		}
	}

	/** Updates the current color for a given node by merging in the given changes */
	private updateCurrentColor(valueDB: ValueDB, colorTable: ColorTable) {
		let updatedRGB = false;
		const currentCompoundValue =
			valueDB.getValue<Partial<Record<ColorKey, number>>>(
				getCurrentColorValueID(this.endpoint.index),
			) ?? {};
		const targetCompoundValue =
			valueDB.getValue<Partial<Record<ColorKey, number>>>(
				getCurrentColorValueID(this.endpoint.index),
			) ?? {};
		for (const [key, value] of entries(colorTable)) {
			const component = colorTableKeyToComponent(key);
			if (
				component === ColorComponent.Red ||
				component === ColorComponent.Green ||
				component === ColorComponent.Blue
			) {
				updatedRGB = true;
			}

			valueDB.setValue(
				getCurrentColorValueID(this.endpoint.index, component),
				value,
			);

			// Update the compound value
			if (key in ColorComponentMap) {
				currentCompoundValue[key as ColorKey] = value;
				targetCompoundValue[key as ColorKey] = value;
			}
		}
		// And store the updated compound values
		valueDB.setValue(
			getCurrentColorValueID(this.endpoint.index),
			currentCompoundValue,
		);
		valueDB.setValue(
			getTargetColorValueID(this.endpoint.index),
			targetCompoundValue,
		);

		// and hex color if necessary
		const supportsHex = valueDB.getValue<boolean>(
			getSupportsHexColorValueID(this.endpoint.index),
		);
		if (supportsHex && updatedRGB) {
			const hexValueId = getHexColorValueID(this.endpoint.index);
			const [r, g, b] = [
				ColorComponent.Red,
				ColorComponent.Green,
				ColorComponent.Blue,
			].map(
				(c) =>
					valueDB.getValue<number>(
						getCurrentColorValueID(this.endpoint.index, c),
					) ?? 0,
			);
			const hexValue = (r << 16) | (g << 8) | b;
			valueDB.setValue(
				hexValueId,
				hexValue.toString(16).padStart(6, "0"),
			);
		}
	}

	@validateArgs({ strictEnums: true })
	public async startLevelChange(
		options: ColorSwitchCCStartLevelChangeOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.StartLevelChange,
		);

		const cc = new ColorSwitchCCStartLevelChange(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async stopLevelChange(
		colorComponent: ColorComponent,
	): Promise<void> {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.StopLevelChange,
		);

		const cc = new ColorSwitchCCStopLevelChange(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			colorComponent,
		});

		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
		options,
	) => {
		if (property === "targetColor") {
			const duration = Duration.from(options?.transitionDuration);
			if (propertyKey != undefined) {
				// Single color component, only accepts numbers
				if (typeof propertyKey !== "number") {
					throwUnsupportedPropertyKey(
						this.ccId,
						property,
						propertyKey,
					);
				} else if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				await this.set({ [propertyKey]: value, duration });

				if (this.isSinglecast()) {
					// Verify the current value after a (short) delay
					this.schedulePoll({ property, propertyKey }, value, {
						duration,
						transition: "fast",
					});
				}
			} else {
				// Set the compound color object

				// Ensure the value is an object with only valid keys
				if (
					!isObject(value) ||
					!Object.keys(value).every((key) => key in ColorComponentMap)
				) {
					throw new ZWaveError(
						`${
							CommandClasses[this.ccId]
						}: "${property}" must be set to an object which specifies each color channel`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}

				// Ensure that each property is numeric
				for (const [key, val] of entries(value)) {
					if (typeof val !== "number") {
						throwWrongValueType(
							this.ccId,
							`${property}.${key}`,
							"number",
							typeof val,
						);
					}
				}

				// GH#2527: strip unsupported color components, because some devices don't react otherwise
				if (this.isSinglecast()) {
					const supportedColors = this.tryGetValueDB()?.getValue<
						readonly ColorComponent[]
					>(getSupportedColorComponentsValueID(this.endpoint.index));
					if (supportedColors) {
						value = pick(
							value,
							supportedColors
								.map((c) => colorComponentToTableKey(c))
								.filter((c) => !!c) as ColorKey[],
						);
					}
				}

				// Avoid sending empty commands
				if (Object.keys(value as any).length === 0) return;

				await this.set({ ...(value as ColorTable), duration });

				// We're not going to poll each color component separately
			}
		} else if (property === "hexColor") {
			// No property key, this is the hex color #rrggbb
			if (typeof value !== "string") {
				throwWrongValueType(
					this.ccId,
					property,
					"string",
					typeof value,
				);
			}

			const duration = Duration.from(options?.transitionDuration);
			await this.set({ hexColor: value, duration });
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	public isSetValueOptimistic(_valueId: ValueID): boolean {
		return false; // Color Switch CC handles updating the value DB itself
	}

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
		propertyKey,
	}): Promise<unknown> => {
		if (propertyKey == undefined) {
			throwMissingPropertyKey(this.ccId, property);
		} else if (typeof propertyKey !== "number") {
			throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
		}

		switch (property) {
			case "currentColor":
				return (await this.get(propertyKey))?.currentValue;
			case "targetColor":
				return (await this.get(propertyKey))?.targetValue;
			case "duration":
				return (await this.get(propertyKey))?.duration;
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};
}

@commandClass(CommandClasses["Color Switch"])
@implementedVersion(3)
export class ColorSwitchCC extends CommandClass {
	declare ccCommand: ColorSwitchCommand;

	public constructor(host: ZWaveHost, options: CommandClassOptions) {
		super(host, options);
		this.registerValue(getSupportsHexColorValueID(0).property, {
			internal: true,
		});
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Color Switch"],
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
			endpoint: this.endpointIndex,
			message: "querying supported colors...",
			direction: "outbound",
		});
		const supportedColors = await api.getSupported();
		if (!supportedColors) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported colors timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `received supported colors:${supportedColors
				.map((c) => `\n· ${getEnumMemberName(ColorComponent, c)}`)
				.join("")}`,
			direction: "outbound",
		});

		// Create metadata for the separate color channels
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
		// And the compound one
		valueDB.setMetadata(getCurrentColorValueID(this.endpointIndex), {
			...ValueMetadata.ReadOnly,
			label: `Current Color`,
		});
		valueDB.setMetadata(getTargetColorValueID(this.endpointIndex), {
			...ValueMetadata.Any,
			label: `Target Color`,
			valueChangeOptions: ["transitionDuration"],
		});

		// Create the collective HEX color values
		const supportsHex = [
			ColorComponent.Red,
			ColorComponent.Green,
			ColorComponent.Blue,
		].every((c) => supportedColors.includes(c));
		valueDB.setValue(
			getSupportsHexColorValueID(this.endpointIndex),
			supportsHex,
		);
		if (supportsHex) {
			valueDB.setMetadata(getHexColorValueID(this.endpointIndex), {
				...ValueMetadata.Color,
				minLength: 6,
				maxLength: 7, // to allow #rrggbb
				label: `RGB Color`,
				valueChangeOptions: ["transitionDuration"],
			});
		}

		// Query all color components
		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Color Switch"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB(applHost);

		const supportedColors: readonly ColorComponent[] =
			valueDB.getValue(
				getSupportedColorComponentsValueID(this.endpointIndex),
			) ?? [];

		for (const color of supportedColors) {
			const colorName = getEnumMemberName(ColorComponent, color);
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying current color state (${colorName})`,
				direction: "outbound",
			});
			await api.get(color);
		}
	}

	public translatePropertyKey(
		applHost: ZWaveApplicationHost,
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
		return super.translatePropertyKey(applHost, property, propertyKey);
	}
}

@CCCommand(ColorSwitchCommand.SupportedReport)
export class ColorSwitchCCSupportedReport extends ColorSwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		// Docs say 'variable length', but the table shows 2 bytes.
		validatePayload(this.payload.length >= 2);

		this.supportedColorComponents = parseBitMask(
			this.payload.slice(0, 2),
			ColorComponent["Warm White"],
		);
	}

	@ccValue({ internal: true })
	public readonly supportedColorComponents: readonly ColorComponent[];

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this.colorComponent = this.payload[0];
		this.currentValue = this.payload[1];

		if (this.version >= 3 && this.payload.length >= 4) {
			this.targetValue = this.payload[2];
			this.duration = Duration.parseReport(this.payload[3]);
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		// Duration is stored globally instead of per component
		if (!super.persistValues(applHost)) return false;
		const valueDB = this.getValueDB(applHost);

		const valueId = getCurrentColorValueID(
			this.endpointIndex,
			this.colorComponent,
		);
		valueDB.setValue(valueId, this.currentValue);

		// Update target value if required
		if (this.targetValue != undefined) {
			const targetValueId = getTargetColorValueID(
				this.endpointIndex,
				this.colorComponent,
			);
			valueDB.setValue(targetValueId, this.targetValue);
		}

		// Update compound current value
		const colorTableKey = colorComponentToTableKey(this.colorComponent);
		if (colorTableKey) {
			const compoundValueId = getCurrentColorValueID(this.endpointIndex);
			const compoundValue: Partial<Record<ColorKey, number>> =
				valueDB.getValue(compoundValueId) ?? {};
			compoundValue[colorTableKey] = this.currentValue;
			valueDB.setValue(compoundValueId, compoundValue);

			// and target value
			if (this.targetValue != undefined) {
				const compoundTargetValueId = getTargetColorValueID(
					this.endpointIndex,
				);
				const compoundTargetValue: Partial<Record<ColorKey, number>> =
					valueDB.getValue(compoundTargetValueId) ?? {};
				compoundTargetValue[colorTableKey] = this.targetValue;
				valueDB.setValue(compoundTargetValueId, compoundTargetValue);
			}
		}

		// Update collective hex value if required
		const supportsHex = valueDB.getValue<boolean>(
			getSupportsHexColorValueID(this.endpointIndex),
		);
		if (
			supportsHex &&
			(this.colorComponent === ColorComponent.Red ||
				this.colorComponent === ColorComponent.Green ||
				this.colorComponent === ColorComponent.Blue)
		) {
			const hexValueId = getHexColorValueID(this.endpointIndex);
			const hexValue = valueDB.getValue<string>(hexValueId) ?? "000000";
			const byteOffset = ColorComponent.Blue - this.colorComponent;
			const byteMask = 0xff << (byteOffset * 8);
			let hexValueNumeric = parseInt(hexValue, 16);
			hexValueNumeric =
				(hexValueNumeric & ~byteMask) |
				(this.currentValue << (byteOffset * 8));
			valueDB.setValue(
				hexValueId,
				hexValueNumeric.toString(16).padStart(6, "0"),
			);
		}

		return true;
	}

	public readonly colorComponent: ColorComponent;
	public readonly currentValue: number;
	public readonly targetValue: number | undefined;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyDuration,
		label: "Remaining duration",
	})
	public readonly duration: Duration | undefined;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | ColorSwitchCCGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"color component": getEnumMemberName(
					ColorComponent,
					this.colorComponent,
				),
			},
		};
	}
}

export type ColorSwitchCCSetOptions = (ColorTable | { hexColor: string }) & {
	duration?: Duration | string;
};

@CCCommand(ColorSwitchCommand.Set)
export class ColorSwitchCCSet extends ColorSwitchCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & ColorSwitchCCSetOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			// Populate properties from options object
			if ("hexColor" in options) {
				const match = hexColorRegex.exec(options.hexColor);
				if (!match) {
					throw new ZWaveError(
						`${options.hexColor} is not a valid HEX color string`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				this.colorTable = {
					red: parseInt(match.groups!.red, 16),
					green: parseInt(match.groups!.green, 16),
					blue: parseInt(match.groups!.blue, 16),
				};
			} else {
				this.colorTable = pick(options, colorTableKeys as any[]);
			}
			this.duration = Duration.from(options.duration);
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
			this.payload[i + 1] = clamp(value, 0, 0xff);
			i += 2;
		}
		if (this.version >= 2) {
			this.payload[i] = (
				this.duration ?? Duration.from("default")
			).serializeSet();
		}
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		for (const [key, value] of Object.entries(this.colorTable)) {
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
			...super.toLogEntry(applHost),
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
		duration?: Duration | string;
	};

@CCCommand(ColorSwitchCommand.StartLevelChange)
export class ColorSwitchCCStartLevelChange extends ColorSwitchCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & ColorSwitchCCStartLevelChangeOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.duration = Duration.from(options.duration);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ColorSwitchCCStopLevelChangeOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"color component": getEnumMemberName(
					ColorComponent,
					this.colorComponent,
				),
			},
		};
	}
}
