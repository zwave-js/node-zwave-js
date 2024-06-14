import {
	BasicDeviceClass,
	type CommandClasses,
	type GenericDeviceClass,
	type SpecificDeviceClass,
	getGenericDeviceClass,
	getSpecificDeviceClass,
} from "@zwave-js/core/safe";
import { type JSONObject, getEnumMemberName } from "@zwave-js/shared/safe";

export class DeviceClass {
	public constructor(
		basic: BasicDeviceClass,
		generic: number,
		specific: number,
	) {
		this.basic = basic;
		this.generic = getGenericDeviceClass(generic);
		this.specific = getSpecificDeviceClass(
			generic,
			specific,
		);
	}

	public readonly basic: BasicDeviceClass;
	public readonly generic: GenericDeviceClass;
	public readonly specific: SpecificDeviceClass;

	/** @deprecated This property is no longer in use and contains no information. */
	public get mandatorySupportedCCs(): readonly CommandClasses[] {
		return [];
	}

	/** @deprecated This property is no longer in use and contains no information. */
	public get mandatoryControlledCCs(): readonly CommandClasses[] {
		return [];
	}

	public toJSON(): JSONObject {
		return {
			basic: getEnumMemberName(BasicDeviceClass, this.basic),
			generic: this.generic.label,
			specific: this.specific.label,
		};
	}
}
