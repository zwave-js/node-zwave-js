import {
	BasicDeviceClass,
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

	public toJSON(): JSONObject {
		return {
			basic: getEnumMemberName(BasicDeviceClass, this.basic),
			generic: this.generic.label,
			specific: this.specific.label,
		};
	}
}
