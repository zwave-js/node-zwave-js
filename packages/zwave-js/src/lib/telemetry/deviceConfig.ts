import * as Sentry from "@sentry/node";
import { CommandClasses } from "@zwave-js/core";
import { formatId } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";
import axios from "axios";
import { AssociationGroupInfoCC, ConfigurationCC } from "../commandclass";
import type { ZWaveNode } from "../node/Node";

const missingDeviceConfigCache = new Set<string>();

export async function reportMissingDeviceConfig(
	node: ZWaveNode & {
		manufacturerId: number;
		productType: number;
		productId: number;
		firmwareVersion: string;
	},
): Promise<void> {
	const configFingerprint = `${formatId(node.manufacturerId)}:${formatId(
		node.productType,
	)}:${formatId(node.productId)}:${node.firmwareVersion}`;

	// We used to get a LOT of false positives, so we should check with our device
	// database whether this config file is actually unknown

	// If we tried to report this file earlier, we can skip the report
	if (missingDeviceConfigCache.has(configFingerprint)) return;
	// Otherwise ask our device DB if it exists
	try {
		const { data } = await axios.get(
			`https://devices.zwave-js.io/public_api/getdeviceinfo/${configFingerprint.replace(
				/:/g,
				"/",
			)}`,
		);
		if (
			isObject(data) &&
			typeof data.deviceFound === "boolean" &&
			data.deviceFound
		) {
			// This is a false positive - remember it
			missingDeviceConfigCache.add(configFingerprint);
			return;
		}
	} catch (e) {
		// didn't work, try again next time
		return;
	}

	const message = `Missing device config: ${configFingerprint}`;

	const deviceInfo: Record<string, any> = {
		supportsConfigCCV3:
			node.getCCVersion(CommandClasses.Configuration) >= 3,
		supportsAGI: node.supportsCC(
			CommandClasses["Association Group Information"],
		),
		supportsZWavePlus: node.supportsCC(CommandClasses["Z-Wave Plus Info"]),
	};
	try {
		if (deviceInfo.supportsConfigCCV3) {
			// Try to collect all info about config params we can get
			const instance = node.createCCInstanceUnsafe(ConfigurationCC)!;
			deviceInfo.parameters = instance.getQueriedParamInfos();
		}
		if (deviceInfo.supportsAGI) {
			// Try to collect all info about association groups we can get
			const associationGroupCount = AssociationGroupInfoCC[
				"getAssociationGroupCountCached"
			](node["driver"], node);
			const names: string[] = [];
			for (let group = 1; group <= associationGroupCount; group++) {
				names.push(
					AssociationGroupInfoCC.getGroupNameCached(
						node["driver"],
						node,
						group,
					) ?? "",
				);
			}
			deviceInfo.associationGroups = names;
		}
		if (deviceInfo.supportsZWavePlus) {
			deviceInfo.zWavePlusVersion = node.zwavePlusVersion;
		}
	} catch {
		// Don't fail on the last meters :)
	}
	Sentry.captureMessage(message, (scope) => {
		scope.clearBreadcrumbs();
		// Group by device config, otherwise Sentry groups by "Unknown device config", which is nonsense
		scope.setFingerprint([configFingerprint]);
		scope.setExtras(deviceInfo);
		return scope;
	});
	// Remember that we reported the config
	missingDeviceConfigCache.add(configFingerprint);
}
