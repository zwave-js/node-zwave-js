import { CommandClasses } from "@zwave-js/core/safe";
import { JSONObject, num2hex } from "@zwave-js/shared/safe";
import { distinct } from "alcalzone-shared/arrays";
import { entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { hexKeyRegexNDigits, throwInvalidConfig } from "./utils_safe";

export type BasicDeviceClassMap = ReadonlyMap<number, string>;
export type GenericDeviceClassMap = ReadonlyMap<number, GenericDeviceClass>;

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

		if (definition.zwavePlusDeviceType != undefined) {
			if (typeof definition.zwavePlusDeviceType !== "string") {
				throwInvalidConfig(
					"device classes",
					`The zwavePlusDeviceType for generic device class ${num2hex(
						key,
					)} is not a string!`,
				);
			} else {
				this.zwavePlusDeviceType = definition.zwavePlusDeviceType;
			}
		}

		if (definition.requiresSecurity != undefined) {
			if (typeof definition.requiresSecurity !== "boolean") {
				throwInvalidConfig(
					"device classes",
					`The requiresSecurity property for generic device class ${num2hex(
						key,
					)} is not a boolean!`,
				);
			} else {
				this.requiresSecurity = definition.requiresSecurity;
			}
		}

		if (definition.supportedCCs != undefined) {
			if (
				!isArray(definition.supportedCCs) ||
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
				!isArray(definition.controlledCCs) ||
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
						`found invalid key "${specificKey}" in device class ${
							this.label
						} (${num2hex(
							this.key,
						)}). Device classes must have lowercase hexadecimal IDs.`,
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
	/** @internal */
	public readonly zwavePlusDeviceType?: string;
	public readonly requiresSecurity?: boolean;
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

		if (definition.zwavePlusDeviceType != undefined) {
			if (typeof definition.zwavePlusDeviceType !== "string") {
				throwInvalidConfig(
					"device classes",
					`The zwavePlusDeviceType for device class ${
						generic.label
					} -> ${num2hex(key)} is not a string!`,
				);
			} else {
				this.zwavePlusDeviceType = definition.zwavePlusDeviceType;
			}
		} else if (generic.zwavePlusDeviceType != undefined) {
			this.zwavePlusDeviceType = generic.zwavePlusDeviceType;
		}

		if (definition.requiresSecurity != undefined) {
			if (typeof definition.requiresSecurity !== "boolean") {
				throwInvalidConfig(
					"device classes",
					`The requiresSecurity property for device class ${
						generic.label
					} -> ${num2hex(key)} is not a string!`,
				);
			} else {
				this.requiresSecurity = definition.requiresSecurity;
			}
		} else if (generic.requiresSecurity != undefined) {
			this.requiresSecurity = generic.requiresSecurity;
		}

		if (definition.supportedCCs != undefined) {
			if (
				!isArray(definition.supportedCCs) ||
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
				!isArray(definition.controlledCCs) ||
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
	public readonly zwavePlusDeviceType?: string;
	public readonly requiresSecurity?: boolean;
	public readonly supportedCCs: readonly CommandClasses[];
	public readonly controlledCCs: readonly CommandClasses[];
}
