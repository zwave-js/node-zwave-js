import { CommandClasses, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { JSONObject, num2hex } from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import log from "./Logger";
import { configDir, hexKeyRegexNDigits, throwInvalidConfig } from "./utils";

const configPath = path.join(configDir, "deviceClasses.json");

let basicDeviceClasses: ReadonlyMap<number, string> | undefined;
let genericDeviceClasses: ReadonlyMap<number, GenericDeviceClass> | undefined;

/** @internal */
export async function loadDeviceClassesInternal(): Promise<{
	basic: Exclude<typeof basicDeviceClasses, undefined>;
	generic: Exclude<typeof genericDeviceClasses, undefined>;
}> {
	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The device classes config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents) as JSONObject;
		if (!isObject(definition)) {
			throwInvalidConfig(
				"device classes",
				`the dictionary is not an object`,
			);
		}

		if (!isObject((definition as any).basic)) {
			throwInvalidConfig(
				"device classes",
				`The "basic" property is not an object`,
			);
		}
		if (!isObject((definition as any).generic)) {
			throwInvalidConfig(
				"device classes",
				`The "generic" property is not an object`,
			);
		}

		const basic = new Map<number, string>();
		for (const [key, basicClass] of entries((definition as any).basic)) {
			if (!hexKeyRegexNDigits.test(key)) {
				throwInvalidConfig(
					"device classes",
					`found non-hex key "${key}" in the basic device class definition`,
				);
			}
			const keyNum = parseInt(key.slice(2), 16);
			basic.set(keyNum, basicClass);
		}
		basicDeviceClasses = basic;

		const generic = new Map<number, GenericDeviceClass>();
		for (const [key, genericDefinition] of entries(
			(definition as any).generic,
		)) {
			if (!hexKeyRegexNDigits.test(key)) {
				throwInvalidConfig(
					"device classes",
					`found non-hex key "${key}" in the generic device class definition`,
				);
			}
			const keyNum = parseInt(key.slice(2), 16);
			generic.set(
				keyNum,
				new GenericDeviceClass(keyNum, genericDefinition),
			);
		}
		genericDeviceClasses = generic;

		return { basic, generic };
	} catch (e: unknown) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("device classes");
		}
	}
}

export async function loadDeviceClasses(): Promise<void> {
	try {
		await loadDeviceClassesInternal();
	} catch (e: unknown) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.config.print(
					`Could not load scales config: ${e.message}`,
					"error",
				);
			}
			basicDeviceClasses = new Map();
			genericDeviceClasses = new Map();
		} else {
			// This is an unexpected error
			throw e;
		}
	}
}

export function getDefaultGenericDeviceClass(key: number): GenericDeviceClass {
	return new GenericDeviceClass(key, {
		label: `UNKNOWN (${num2hex(key)})`,
	});
}

export function getDefaultSpecificDeviceClass(
	generic: GenericDeviceClass,
	key: number,
): SpecificDeviceClass {
	if (key === 0)
		return new SpecificDeviceClass(
			0x00,
			{
				label: "Unused",
			},
			generic,
		);
	return new SpecificDeviceClass(
		key,
		{
			label: `UNKNOWN (${num2hex(key)})`,
		},
		generic,
	);
}

export function lookupBasicDeviceClass(basic: number): BasicDeviceClass {
	if (!basicDeviceClasses) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	return {
		key: basic,
		label: basicDeviceClasses.get(basic) ?? `UNKNOWN (${num2hex(basic)})`,
	};
}

export function lookupGenericDeviceClass(generic: number): GenericDeviceClass {
	if (!genericDeviceClasses) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	return (
		genericDeviceClasses.get(generic) ??
		getDefaultGenericDeviceClass(generic)
	);
}

export function lookupSpecificDeviceClass(
	generic: number,
	specific: number,
): SpecificDeviceClass {
	const genericClass = lookupGenericDeviceClass(generic);
	return (
		genericClass.specific.get(specific) ??
		getDefaultSpecificDeviceClass(genericClass, specific)
	);
}

export interface BasicDeviceClass {
	key: number;
	label: string;
}

export class GenericDeviceClass {
	public constructor(key: number, definition: JSONObject) {
		this.key = key;

		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"device classes",
				`The label for generic device class ${num2hex(
					key,
				)} is not a string!`,
			);
		}
		this.label = definition.label;
		if (
			definition.unit != undefined &&
			typeof definition.unit !== "string"
		) {
			throwInvalidConfig(
				"device classes",
				`The unit for scale ${num2hex(key)} is not a string!`,
			);
		}

		if (definition.supportedCCs != undefined) {
			if (
				!isArray(definition.supportedCCs) &&
				!definition.supportedCCs.every(
					(cc: any) => typeof cc === "string",
				)
			) {
				throwInvalidConfig(
					"device classes",
					`supportedCCs in device class ${this.label} (${num2hex(
						this.key,
					)}) is not a string array!`,
				);
			}
			const supportedCCs: CommandClasses[] = [];
			for (const ccName of definition.supportedCCs) {
				if (!(ccName in CommandClasses)) {
					throwInvalidConfig(
						"device classes",
						`Found unknown CC "${ccName}" in supportedCCs of device class ${
							this.label
						} (${num2hex(this.key)})!`,
					);
				}
				supportedCCs.push((CommandClasses as any)[ccName]);
			}
			this.supportedCCs = supportedCCs;
		} else {
			this.supportedCCs = [];
		}

		if (definition.controlledCCs != undefined) {
			if (
				!isArray(definition.controlledCCs) &&
				!definition.controlledCCs.every(
					(cc: any) => typeof cc === "string",
				)
			) {
				throwInvalidConfig(
					"device classes",
					`controlledCCs in device class ${this.label} (${num2hex(
						this.key,
					)}) is not a string array!`,
				);
			}
			const controlledCCs: CommandClasses[] = [];
			for (const ccName of definition.controlledCCs) {
				if (!(ccName in CommandClasses)) {
					throwInvalidConfig(
						"device classes",
						`Found unknown CC "${ccName}" in controlledCCs of device class ${
							this.label
						} (${num2hex(this.key)})!`,
					);
				}
				controlledCCs.push((CommandClasses as any)[ccName]);
			}
			this.controlledCCs = controlledCCs;
		} else {
			this.controlledCCs = [];
		}

		const specific = new Map<number, SpecificDeviceClass>();
		if (isObject(definition.specific)) {
			for (const [specificKey, specificDefinition] of entries(
				definition.specific,
			)) {
				if (!hexKeyRegexNDigits.test(specificKey))
					throwInvalidConfig(
						"device classes",
						`found non-hex key "${specificKey}" in device class ${
							this.label
						} (${num2hex(this.key)})`,
					);
				const specificKeyNum = parseInt(specificKey.slice(2), 16);
				specific.set(
					specificKeyNum,
					new SpecificDeviceClass(
						specificKeyNum,
						specificDefinition,
						this,
					),
				);
			}
		}
		this.specific = specific;
	}

	public readonly key: number;
	public readonly label: string;
	public readonly supportedCCs: readonly CommandClasses[];
	public readonly controlledCCs: readonly CommandClasses[];
	public readonly specific: ReadonlyMap<number, SpecificDeviceClass>;
}

export class SpecificDeviceClass {
	public constructor(
		key: number,
		definition: JSONObject,
		generic: GenericDeviceClass,
	) {
		this.key = key;

		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"device classes",
				`The label for device class ${generic.label} -> ${num2hex(
					key,
				)} is not a string!`,
			);
		}
		this.label = definition.label;

		if (definition.supportedCCs != undefined) {
			if (
				!isArray(definition.supportedCCs) &&
				!definition.supportedCCs.every(
					(cc: any) => typeof cc === "string",
				)
			) {
				throwInvalidConfig(
					"device classes",
					`supportedCCs in device class ${generic.label} -> ${
						this.label
					} (${num2hex(this.key)}) is not a string array!`,
				);
			}
			const supportedCCs: CommandClasses[] = [];
			for (const ccName of definition.supportedCCs) {
				if (!(ccName in CommandClasses)) {
					throwInvalidConfig(
						"device classes",
						`Found unknown CC "${ccName}" in supportedCCs of device class ${
							generic.label
						} -> ${this.label} (${num2hex(this.key)})!`,
					);
				}
				supportedCCs.push((CommandClasses as any)[ccName]);
			}
			this.supportedCCs = supportedCCs;
		} else {
			this.supportedCCs = [];
		}
		this.supportedCCs = distinct([
			...generic.supportedCCs,
			...this.supportedCCs,
		]);

		if (definition.controlledCCs != undefined) {
			if (
				!isArray(definition.controlledCCs) &&
				!definition.controlledCCs.every(
					(cc: any) => typeof cc === "string",
				)
			) {
				throwInvalidConfig(
					"device classes",
					`controlledCCs in device class ${generic.label} -> ${
						this.label
					} (${num2hex(this.key)}) is not a string array!`,
				);
			}
			const controlledCCs: CommandClasses[] = [];
			for (const ccName of definition.controlledCCs) {
				if (!(ccName in CommandClasses)) {
					throwInvalidConfig(
						"device classes",
						`Found unknown CC "${ccName}" in controlledCCs of device class ${
							generic.label
						} -> ${this.label} (${num2hex(this.key)})!`,
					);
				}
				controlledCCs.push((CommandClasses as any)[ccName]);
			}
			this.controlledCCs = controlledCCs;
		} else {
			this.controlledCCs = [];
		}
		this.controlledCCs = distinct([
			...generic.controlledCCs,
			...this.controlledCCs,
		]);
	}

	public readonly key: number;
	public readonly label: string;
	public readonly supportedCCs: readonly CommandClasses[];
	public readonly controlledCCs: readonly CommandClasses[];
}
