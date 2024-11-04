import {
	CacheBackedMap,
	type CommandClasses,
	type MaybeNotKnown,
	NOT_KNOWN,
	type QuerySecurityClasses,
	SecurityClass,
	type SetSecurityClass,
	securityClassOrder,
} from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import { type Driver } from "../../driver/Driver.js";
import { cacheKeys } from "../../driver/NetworkCache.js";
import { type DeviceClass } from "../DeviceClass.js";
import { NetworkRoleMixin } from "./01_NetworkRole.js";

export abstract class NodeSecurityMixin extends NetworkRoleMixin
	implements QuerySecurityClasses, SetSecurityClass
{
	public constructor(
		nodeId: number,
		driver: Driver,
		index: number,
		deviceClass?: DeviceClass,
		supportedCCs?: CommandClasses[],
	) {
		super(nodeId, driver, index, deviceClass, supportedCCs);

		this.securityClasses = new CacheBackedMap(this.driver.networkCache, {
			prefix: cacheKeys.node(this.id)._securityClassBaseKey + ".",
			suffixSerializer: (value: SecurityClass) =>
				getEnumMemberName(SecurityClass, value),
			suffixDeserializer: (key: string) => {
				if (
					key in SecurityClass
					&& typeof (SecurityClass as any)[key] === "number"
				) {
					return (SecurityClass as any)[key];
				}
			},
		});
	}

	/** @internal */
	// This a CacheBackedMap that's assigned in the constructor
	public readonly securityClasses: Map<SecurityClass, boolean>;

	public get isSecure(): MaybeNotKnown<boolean> {
		const securityClass = this.getHighestSecurityClass();
		if (securityClass == undefined) return NOT_KNOWN;
		if (securityClass === SecurityClass.None) return false;
		return true;
	}

	public hasSecurityClass(
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean> {
		return this.securityClasses.get(securityClass);
	}

	public setSecurityClass(
		securityClass: SecurityClass,
		granted: boolean,
	): void {
		this.securityClasses.set(securityClass, granted);
	}

	public getHighestSecurityClass(): MaybeNotKnown<SecurityClass> {
		if (this.securityClasses.size === 0) return undefined;
		let missingSome = false;
		for (const secClass of securityClassOrder) {
			if (this.securityClasses.get(secClass) === true) return secClass;
			if (!this.securityClasses.has(secClass)) {
				missingSome = true;
			}
		}
		// If we don't have the info for every security class, we don't know the highest one yet
		return missingSome ? NOT_KNOWN : SecurityClass.None;
	}
}
