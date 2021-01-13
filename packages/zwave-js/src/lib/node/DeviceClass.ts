import type {
	BasicDeviceClass,
	ConfigManager,
	GenericDeviceClass,
	SpecificDeviceClass,
} from "@zwave-js/config";
import { CommandClasses } from "@zwave-js/core";
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

		// The specific class' CCs include the generic class' CCs
		this._mandatorySupportedCCs = this.specific.supportedCCs;
		this._mandatoryControlledCCs = this.specific.controlledCCs;
	}

	public readonly basic: BasicDeviceClass;
	public readonly generic: GenericDeviceClass;
	public readonly specific: SpecificDeviceClass;

	private _mandatorySupportedCCs: readonly CommandClasses[];
	public get mandatorySupportedCCs(): readonly CommandClasses[] {
		return this._mandatorySupportedCCs;
	}

	private _mandatoryControlledCCs: readonly CommandClasses[];
	public get mandatoryControlledCCs(): readonly CommandClasses[] {
		return this._mandatoryControlledCCs;
	}

	public toJSON(): JSONObject {
		return {
			basic: this.basic.label,
			generic: this.generic.label,
			specific: this.specific.label,
			mandatorySupportedCCs: this._mandatorySupportedCCs.map(
				(cc) => CommandClasses[cc],
			),
			mandatoryControlCCs: this._mandatoryControlledCCs.map(
				(cc) => CommandClasses[cc],
			),
		};
	}
}
