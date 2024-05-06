import { type JSONObject, num2hex } from "@zwave-js/shared/safe";
import { isObject } from "alcalzone-shared/typeguards";
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
	if (key === 0) {
		return new SpecificDeviceClass(
			0x00,
			{
				label: "Unused",
			},
			generic,
		);
	}
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
				`The label for generic device class ${
					num2hex(
						key,
					)
				} is not a string!`,
			);
		}
		this.label = definition.label;

		if (definition.zwavePlusDeviceType != undefined) {
			if (typeof definition.zwavePlusDeviceType !== "string") {
				throwInvalidConfig(
					"device classes",
					`The zwavePlusDeviceType for generic device class ${
						num2hex(
							key,
						)
					} is not a string!`,
				);
			} else {
				this.zwavePlusDeviceType = definition.zwavePlusDeviceType;
			}
		}

		if (definition.requiresSecurity != undefined) {
			if (typeof definition.requiresSecurity !== "boolean") {
				throwInvalidConfig(
					"device classes",
					`The requiresSecurity property for generic device class ${
						num2hex(
							key,
						)
					} is not a boolean!`,
				);
			} else {
				this.requiresSecurity = definition.requiresSecurity;
			}
		}

		if (definition.maySupportBasicCC != undefined) {
			if (definition.maySupportBasicCC !== false) {
				throwInvalidConfig(
					"device classes",
					`maySupportBasicCC in device class ${this.label} (${
						num2hex(this.key)
					}) must be false or omitted (= true)!`,
				);
			} else {
				this.maySupportBasicCC = false;
			}
		} else {
			this.maySupportBasicCC = true;
		}

		const specific = new Map<number, SpecificDeviceClass>();
		if (isObject(definition.specific)) {
			for (
				const [specificKey, specificDefinition] of Object.entries(
					definition.specific,
				)
			) {
				if (!hexKeyRegexNDigits.test(specificKey)) {
					throwInvalidConfig(
						"device classes",
						`found invalid key "${specificKey}" in device class ${this.label} (${
							num2hex(
								this.key,
							)
						}). Device classes must have lowercase hexadecimal IDs.`,
					);
				}
				const specificKeyNum = parseInt(specificKey.slice(2), 16);
				specific.set(
					specificKeyNum,
					new SpecificDeviceClass(
						specificKeyNum,
						specificDefinition as any,
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
	public readonly maySupportBasicCC: boolean;
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
				`The label for device class ${generic.label} -> ${
					num2hex(
						key,
					)
				} is not a string!`,
			);
		}
		this.label = definition.label;

		if (definition.zwavePlusDeviceType != undefined) {
			if (typeof definition.zwavePlusDeviceType !== "string") {
				throwInvalidConfig(
					"device classes",
					`The zwavePlusDeviceType for device class ${generic.label} -> ${
						num2hex(key)
					} is not a string!`,
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
					`The requiresSecurity property for device class ${generic.label} -> ${
						num2hex(key)
					} is not a string!`,
				);
			} else {
				this.requiresSecurity = definition.requiresSecurity;
			}
		} else if (generic.requiresSecurity != undefined) {
			this.requiresSecurity = generic.requiresSecurity;
		}

		if (definition.maySupportBasicCC != undefined) {
			if (definition.maySupportBasicCC !== false) {
				throwInvalidConfig(
					"device classes",
					`maySupportBasicCC in device class ${generic.label} -> ${this.label} (${
						num2hex(this.key)
					}) must be false or omitted (= true)!`,
				);
			} else {
				this.maySupportBasicCC = false;
			}
		} else {
			this.maySupportBasicCC = true;
		}
	}

	public readonly key: number;
	public readonly label: string;
	public readonly zwavePlusDeviceType?: string;
	public readonly requiresSecurity?: boolean;
	public readonly maySupportBasicCC: boolean;
}
