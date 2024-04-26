import type {
	BasicDeviceClass,
	ConfigManager,
	GenericDeviceClass,
	SpecificDeviceClass,
} from "@zwave-js/config";
import { type CommandClasses } from "@zwave-js/core";
import type { JSONObject } from "@zwave-js/shared";

export class DeviceClass {
	public constructor(
		configManager: ConfigManager,
		basic: number,
		generic: number,
		specific: number,
	) {
		this.basic = configManager.lookupBasicDeviceClass(basic);
		this.generic = configManager.lookupGenericDeviceClass(generic);
		this.specific = configManager.lookupSpecificDeviceClass(
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
			basic: this.basic.label,
			generic: this.generic.label,
			specific: this.specific.label,
		};
	}
}
