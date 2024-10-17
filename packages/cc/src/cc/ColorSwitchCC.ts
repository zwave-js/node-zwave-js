import {
	CommandClasses,
	Duration,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	type ValueDB,
	type ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	isUnsupervisedOrSucceeded,
	parseBitMask,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown, encodeBitMask } from "@zwave-js/core/safe";
import type { CCEncodingContext, GetValueDB } from "@zwave-js/host/safe";
import {
	type AllOrNone,
	getEnumMemberName,
	isEnumMember,
	keysOf,
	pick,
} from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { clamp } from "alcalzone-shared/math";
import { isObject } from "alcalzone-shared/typeguards";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
	getEffectiveCCVersion,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	ColorComponent,
	ColorComponentMap,
	type ColorKey,
	ColorSwitchCommand,
	type ColorTable,
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

export const ColorSwitchCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Color Switch"], {
		...V.staticProperty("supportedColorComponents", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsHexColor", undefined, {
			internal: true,
		}),

		// The compound color (static)
		...V.staticPropertyWithName(
			"currentColor",
			"currentColor",
			{
				...ValueMetadata.ReadOnly,
				label: `Current color`,
			} as const,
		),
		...V.staticPropertyWithName(
			"targetColor",
			"targetColor",
			{
				...ValueMetadata.Any,
				label: `Target color`,
				valueChangeOptions: ["transitionDuration"],
			} as const,
		),
		...V.staticProperty(
			"duration",
			{
				...ValueMetadata.ReadOnlyDuration,
				label: "Remaining duration",
			} as const,
		),

		// The compound color as HEX
		...V.staticProperty(
			"hexColor",
			{
				...ValueMetadata.Color,
				minLength: 6,
				maxLength: 7, // to allow #rrggbb
				label: `RGB Color`,
				valueChangeOptions: ["transitionDuration"],
			} as const,
		),
	}),

	...V.defineDynamicCCValues(CommandClasses["Color Switch"], {
		// The individual color channels (dynamic)
		...V.dynamicPropertyAndKeyWithName(
			"currentColorChannel",
			"currentColor",
			(component: ColorComponent) => component,
			({ property, propertyKey }) =>
				property === "currentColor" && typeof propertyKey === "number",
			(component: ColorComponent) => {
				const colorName = getEnumMemberName(ColorComponent, component);
				return {
					...ValueMetadata.ReadOnlyUInt8,
					label: `Current value (${colorName})`,
					description:
						`The current value of the ${colorName} channel.`,
				} as const;
			},
		),
		...V.dynamicPropertyAndKeyWithName(
			"targetColorChannel",
			"targetColor",
			(component: ColorComponent) => component,
			({ property, propertyKey }) =>
				property === "targetColor" && typeof propertyKey === "number",
			(component: ColorComponent) => {
				const colorName = getEnumMemberName(ColorComponent, component);
				return {
					...ValueMetadata.UInt8,
					label: `Target value (${colorName})`,
					description:
						`The target value of the ${colorName} channel.`,
					valueChangeOptions: ["transitionDuration"],
				} as const;
			},
		),
	}),
});

@API(CommandClasses["Color Switch"])
export class ColorSwitchCCAPI extends CCAPI {
	public supportsCommand(cmd: ColorSwitchCommand): MaybeNotKnown<boolean> {
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
		MaybeNotKnown<readonly ColorComponent[]>
	> {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.SupportedGet,
		);

		const cc = new ColorSwitchCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			ColorSwitchCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedColorComponents;
	}

	@validateArgs({ strictEnums: true })
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(component: ColorComponent) {
		this.assertSupportsCommand(ColorSwitchCommand, ColorSwitchCommand.Get);

		const cc = new ColorSwitchCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			colorComponent: component,
		});
		const response = await this.host.sendCommand<ColorSwitchCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["currentValue", "targetValue", "duration"]);
		}
	}

	@validateArgs()
	public async set(
		options: ColorSwitchCCSetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(ColorSwitchCommand, ColorSwitchCommand.Set);

		const cc = new ColorSwitchCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		const result = await this.host.sendCommand(cc, this.commandOptions);

		if (isUnsupervisedOrSucceeded(result)) {
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
					const valueDB = this.host.tryGetValueDB(node.id);
					if (valueDB) {
						this.updateCurrentColor(valueDB, cc.colorTable);
					}
				}
			}
		}

		return result;
	}

	/** Updates the current color for a given node by merging in the given changes */
	private updateCurrentColor(valueDB: ValueDB, colorTable: ColorTable) {
		let updatedRGB = false;
		const currentColorValueId = ColorSwitchCCValues.currentColor.endpoint(
			this.endpoint.index,
		);
		const targetColorValueId = ColorSwitchCCValues.targetColor.endpoint(
			this.endpoint.index,
		);
		const currentCompoundColor =
			valueDB.getValue<Partial<Record<ColorKey, number>>>(
				currentColorValueId,
			) ?? {};
		const targetCompoundColor =
			valueDB.getValue<Partial<Record<ColorKey, number>>>(
				targetColorValueId,
			) ?? {};

		for (const [key, value] of Object.entries(colorTable)) {
			const component = colorTableKeyToComponent(key);
			if (
				component === ColorComponent.Red
				|| component === ColorComponent.Green
				|| component === ColorComponent.Blue
			) {
				updatedRGB = true;
			}

			valueDB.setValue(
				ColorSwitchCCValues.currentColorChannel(component).endpoint(
					this.endpoint.index,
				),
				value,
			);

			// Update the compound value
			if (key in ColorComponentMap) {
				currentCompoundColor[key as ColorKey] = value;
				targetCompoundColor[key as ColorKey] = value;
			}
		}
		// And store the updated compound values
		valueDB.setValue(currentColorValueId, currentCompoundColor);
		valueDB.setValue(targetColorValueId, targetCompoundColor);

		// and hex color if necessary
		const supportsHex = valueDB.getValue<boolean>(
			ColorSwitchCCValues.supportsHexColor.endpoint(this.endpoint.index),
		);
		if (supportsHex && updatedRGB) {
			const hexValueId = ColorSwitchCCValues.hexColor.endpoint(
				this.endpoint.index,
			);
			const [r, g, b] = [
				ColorComponent.Red,
				ColorComponent.Green,
				ColorComponent.Blue,
			].map(
				(c) =>
					valueDB.getValue<number>(
						ColorSwitchCCValues.currentColorChannel(c).endpoint(
							this.endpoint.index,
						),
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
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.StartLevelChange,
		);

		const cc = new ColorSwitchCCStartLevelChange({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async stopLevelChange(
		colorComponent: ColorComponent,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ColorSwitchCommand,
			ColorSwitchCommand.StopLevelChange,
		);

		const cc = new ColorSwitchCCStopLevelChange({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			colorComponent,
		});

		return this.host.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: ColorSwitchCCAPI,
			{ property, propertyKey },
			value,
			options,
		) {
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
					const result = await this.set({
						[propertyKey]: value,
						duration,
					});

					if (
						this.isSinglecast()
						&& !supervisedCommandSucceeded(result)
					) {
						// Verify the current value after a (short) delay, unless the command was supervised and successful
						this.schedulePoll({ property, propertyKey }, value, {
							duration,
							transition: "fast",
						});
					}

					return result;
				} else {
					// Set the compound color object

					// Ensure the value is an object with only valid keys
					if (
						!isObject(value)
						|| !Object.keys(value).every(
							(key) => key in ColorComponentMap,
						)
					) {
						throw new ZWaveError(
							`${
								CommandClasses[this.ccId]
							}: "${property}" must be set to an object which specifies each color channel`,
							ZWaveErrorCodes.Argument_Invalid,
						);
					}

					// Ensure that each property is numeric
					for (const [key, val] of Object.entries(value)) {
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
						>(
							ColorSwitchCCValues.supportedColorComponents
								.endpoint(
									this.endpoint.index,
								),
						);
						if (supportedColors) {
							value = pick(
								value,
								supportedColors
									.map((c) => colorComponentToTableKey(c))
									.filter((c) => !!c),
							);
						}
					}

					// Avoid sending empty commands
					if (Object.keys(value as any).length === 0) return;

					return this.set({ ...(value as ColorTable), duration });

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
				return this.set({ hexColor: value, duration });
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	public isSetValueOptimistic(_valueId: ValueID): boolean {
		return false; // Color Switch CC handles updating the value DB itself
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: ColorSwitchCCAPI,
			{ property, propertyKey },
		) {
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
}

@commandClass(CommandClasses["Color Switch"])
@implementedVersion(3)
@ccValues(ColorSwitchCCValues)
export class ColorSwitchCC extends CommandClass {
	declare ccCommand: ColorSwitchCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Color Switch"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying supported colors...",
			direction: "outbound",
		});
		const supportedColors = await api.getSupported();
		if (!supportedColors) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported colors timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `received supported colors:${
				supportedColors
					.map((c) => `\n· ${getEnumMemberName(ColorComponent, c)}`)
					.join("")
			}`,
			direction: "outbound",
		});

		// Create metadata for the separate color channels
		for (const color of supportedColors) {
			const currentColorChannelValue = ColorSwitchCCValues
				.currentColorChannel(color);
			this.setMetadata(ctx, currentColorChannelValue);

			const targetColorChannelValue = ColorSwitchCCValues
				.targetColorChannel(color);
			this.setMetadata(ctx, targetColorChannelValue);
		}
		// And the compound one
		const currentColorValue = ColorSwitchCCValues.currentColor;
		this.setMetadata(ctx, currentColorValue);
		const targetColorValue = ColorSwitchCCValues.targetColor;
		this.setMetadata(ctx, targetColorValue);

		// Create the collective HEX color values
		const supportsHex = [
			ColorComponent.Red,
			ColorComponent.Green,
			ColorComponent.Blue,
		].every((c) => supportedColors.includes(c));
		this.setValue(
			ctx,
			ColorSwitchCCValues.supportsHexColor,
			supportsHex,
		);
		if (supportsHex) {
			const hexColorValue = ColorSwitchCCValues.hexColor;
			this.setMetadata(ctx, hexColorValue);
		}

		// Query all color components
		await this.refreshValues(ctx);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Color Switch"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const supportedColors: readonly ColorComponent[] = this.getValue(
			ctx,
			ColorSwitchCCValues.supportedColorComponents,
		) ?? [];

		for (const color of supportedColors) {
			// Some devices report invalid colors, but the CC API checks
			// for valid values and throws otherwise.
			if (!isEnumMember(ColorComponent, color)) continue;

			const colorName = getEnumMemberName(ColorComponent, color);
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying current color state (${colorName})`,
				direction: "outbound",
			});
			await api.get(color);
		}
	}

	public translatePropertyKey(
		ctx: GetValueDB,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (
			(property === "currentColor" || property === "targetColor")
			&& typeof propertyKey === "number"
		) {
			const translated = ColorComponent[propertyKey];
			if (translated) return translated;
		}
		return super.translatePropertyKey(ctx, property, propertyKey);
	}
}

// @publicAPI
export interface ColorSwitchCCSupportedReportOptions {
	supportedColorComponents: readonly ColorComponent[];
}

@CCCommand(ColorSwitchCommand.SupportedReport)
export class ColorSwitchCCSupportedReport extends ColorSwitchCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| (ColorSwitchCCSupportedReportOptions & CCCommandOptions),
	) {
		super(options);

		if (gotDeserializationOptions(options)) {
			// Docs say 'variable length', but the table shows 2 bytes.
			validatePayload(this.payload.length >= 2);

			this.supportedColorComponents = parseBitMask(
				this.payload.subarray(0, 2),
				ColorComponent["Warm White"],
			);
		} else {
			this.supportedColorComponents = options.supportedColorComponents;
		}
	}

	@ccValue(ColorSwitchCCValues.supportedColorComponents)
	public readonly supportedColorComponents: readonly ColorComponent[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = encodeBitMask(
			this.supportedColorComponents,
			15, // fixed 2 bytes
			ColorComponent["Warm White"],
		);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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

// @publicAPI
export type ColorSwitchCCReportOptions =
	& {
		colorComponent: ColorComponent;
		currentValue: number;
	}
	& AllOrNone<{
		targetValue: number;
		duration: Duration | string;
	}>;

@CCCommand(ColorSwitchCommand.Report)
export class ColorSwitchCCReport extends ColorSwitchCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| (ColorSwitchCCReportOptions & CCCommandOptions),
	) {
		super(options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.colorComponent = this.payload[0];
			this.currentValue = this.payload[1];

			if (this.payload.length >= 4) {
				this.targetValue = this.payload[2];
				this.duration = Duration.parseReport(this.payload[3]);
			}
		} else {
			this.colorComponent = options.colorComponent;
			this.currentValue = options.currentValue;
			this.targetValue = options.targetValue;
			this.duration = Duration.from(options.duration);
		}
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		// Duration is stored globally instead of per component
		if (!super.persistValues(ctx)) return false;

		// Update compound current value
		const colorTableKey = colorComponentToTableKey(this.colorComponent);
		if (colorTableKey) {
			const compoundCurrentColorValue = ColorSwitchCCValues.currentColor;
			const compoundCurrentColor: Partial<Record<ColorKey, number>> =
				this.getValue(ctx, compoundCurrentColorValue) ?? {};
			compoundCurrentColor[colorTableKey] = this.currentValue;
			this.setValue(
				ctx,
				compoundCurrentColorValue,
				compoundCurrentColor,
			);

			// and target value
			if (this.targetValue != undefined) {
				const compoundTargetColorValue =
					ColorSwitchCCValues.targetColor;
				const compoundTargetColor: Partial<Record<ColorKey, number>> =
					this.getValue(ctx, compoundTargetColorValue) ?? {};
				compoundTargetColor[colorTableKey] = this.targetValue;
				this.setValue(
					ctx,
					compoundTargetColorValue,
					compoundTargetColor,
				);
			}
		}

		// Update collective hex value if required
		const supportsHex = !!this.getValue(
			ctx,
			ColorSwitchCCValues.supportsHexColor,
		);
		if (
			supportsHex
			&& (this.colorComponent === ColorComponent.Red
				|| this.colorComponent === ColorComponent.Green
				|| this.colorComponent === ColorComponent.Blue)
		) {
			const hexColorValue = ColorSwitchCCValues.hexColor;

			const hexValue: string = this.getValue(ctx, hexColorValue)
				?? "000000";
			const byteOffset = ColorComponent.Blue - this.colorComponent;
			const byteMask = 0xff << (byteOffset * 8);
			let hexValueNumeric = parseInt(hexValue, 16);
			hexValueNumeric = (hexValueNumeric & ~byteMask)
				| (this.currentValue << (byteOffset * 8));
			this.setValue(
				ctx,
				hexColorValue,
				hexValueNumeric.toString(16).padStart(6, "0"),
			);
		}

		return true;
	}

	public readonly colorComponent: ColorComponent;
	@ccValue(
		ColorSwitchCCValues.currentColorChannel,
		(self: ColorSwitchCCReport) => [self.colorComponent] as const,
	)
	public readonly currentValue: number;

	@ccValue(
		ColorSwitchCCValues.targetColorChannel,
		(self: ColorSwitchCCReport) => [self.colorComponent] as const,
	)
	public readonly targetValue: number | undefined;

	@ccValue(ColorSwitchCCValues.duration)
	public readonly duration: Duration | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.colorComponent,
			this.currentValue,
		]);
		if (this.targetValue != undefined && this.duration != undefined) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([
					this.targetValue ?? 0xfe,
					(this.duration ?? Duration.default()).serializeReport(),
				]),
			]);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface ColorSwitchCCGetOptions extends CCCommandOptions {
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
		options: CommandClassDeserializationOptions | ColorSwitchCCGetOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this._colorComponent = this.payload[0];
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

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this._colorComponent]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"color component": getEnumMemberName(
					ColorComponent,
					this.colorComponent,
				),
			},
		};
	}
}

// @publicAPI
export type ColorSwitchCCSetOptions = (ColorTable | { hexColor: string }) & {
	duration?: Duration | string;
};

@CCCommand(ColorSwitchCommand.Set)
@useSupervision()
export class ColorSwitchCCSet extends ColorSwitchCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & ColorSwitchCCSetOptions),
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const populatedColorCount = this.payload[0] & 0b11111;

			validatePayload(this.payload.length >= 1 + populatedColorCount * 2);
			this.colorTable = {};
			let offset = 1;
			for (let color = 0; color < populatedColorCount; color++) {
				const component = this.payload[offset];
				const value = this.payload[offset + 1];
				const key = colorComponentToTableKey(component);
				// @ts-expect-error
				if (key) this.colorTable[key] = value;
				offset += 2;
			}
			if (this.payload.length > offset) {
				this.duration = Duration.parseSet(this.payload[offset]);
			}
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

	public serialize(ctx: CCEncodingContext): Buffer {
		const populatedColorCount = Object.keys(this.colorTable).length;
		this.payload = Buffer.allocUnsafe(
			1 + populatedColorCount * 2 + 1,
		);
		this.payload[0] = populatedColorCount & 0b11111;
		let i = 1;
		for (const [key, value] of Object.entries(this.colorTable)) {
			const component = colorTableKeyToComponent(key);
			this.payload[i] = component;
			this.payload[i + 1] = clamp(value, 0, 0xff);
			i += 2;
		}
		this.payload[i] = (
			this.duration ?? Duration.default()
		).serializeSet();

		const ccVersion = getEffectiveCCVersion(ctx, this);
		if (
			ccVersion < 2 && ctx.getDeviceConfig?.(
				this.nodeId as number,
			)?.compat?.encodeCCsUsingTargetVersion
		) {
			// When forcing CC version 1, omit the duration byte
			this.payload = this.payload.subarray(0, -1);
		}

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		for (const [key, value] of Object.entries(this.colorTable)) {
			const realKey: string = key in ColorComponentMap
				? (ColorComponent as any)[(ColorComponentMap as any)[key]]
				: (ColorComponent as any)[key];
			message[realKey] = value;
		}
		if (this.duration != undefined) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type ColorSwitchCCStartLevelChangeOptions =
	& {
		colorComponent: ColorComponent;
		direction: keyof typeof LevelChangeDirection;
	}
	& (
		| {
			ignoreStartLevel: true;
			startLevel?: number;
		}
		| {
			ignoreStartLevel: false;
			startLevel: number;
		}
	)
	& {
		// Version >= 3:
		duration?: Duration | string;
	};

@CCCommand(ColorSwitchCommand.StartLevelChange)
@useSupervision()
export class ColorSwitchCCStartLevelChange extends ColorSwitchCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & ColorSwitchCCStartLevelChangeOptions),
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			const ignoreStartLevel = (this.payload[0] & 0b0_0_1_00000) >>> 5;
			this.ignoreStartLevel = !!ignoreStartLevel;
			const direction = (this.payload[0] & 0b0_1_0_00000) >>> 6;
			this.direction = direction ? "down" : "up";

			this.colorComponent = this.payload[1];
			this.startLevel = this.payload[2];

			if (this.payload.length >= 4) {
				this.duration = Duration.parseSet(this.payload[3]);
			}
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

	public serialize(ctx: CCEncodingContext): Buffer {
		const controlByte = (LevelChangeDirection[this.direction] << 6)
			| (this.ignoreStartLevel ? 0b0010_0000 : 0);
		this.payload = Buffer.from([
			controlByte,
			this.colorComponent,
			this.startLevel,
			(this.duration ?? Duration.default()).serializeSet(),
		]);

		const ccVersion = getEffectiveCCVersion(ctx, this);
		if (
			ccVersion < 3 && ctx.getDeviceConfig?.(
				this.nodeId as number,
			)?.compat?.encodeCCsUsingTargetVersion
		) {
			// When forcing CC version 1 or 2, omit the duration byte
			this.payload = this.payload.subarray(0, -1);
		}

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface ColorSwitchCCStopLevelChangeOptions extends CCCommandOptions {
	colorComponent: ColorComponent;
}

@CCCommand(ColorSwitchCommand.StopLevelChange)
@useSupervision()
export class ColorSwitchCCStopLevelChange extends ColorSwitchCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| ColorSwitchCCStopLevelChangeOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.colorComponent = this.payload[0];
		} else {
			this.colorComponent = options.colorComponent;
		}
	}

	public readonly colorComponent: ColorComponent;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.colorComponent]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"color component": getEnumMemberName(
					ColorComponent,
					this.colorComponent,
				),
			},
		};
	}
}
