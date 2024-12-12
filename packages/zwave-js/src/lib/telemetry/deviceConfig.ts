// import got from "@esm2cjs/got";
// import { AssociationGroupInfoCC, ConfigurationCC } from "@zwave-js/cc";
// import { CommandClasses } from "@zwave-js/core";
// import { formatId } from "@zwave-js/shared";
// import { isObject } from "alcalzone-shared/typeguards";
import type { ZWaveNode } from "../node/Node.js";

// const missingDeviceConfigCache = new Set<string>();

export async function reportMissingDeviceConfig(
	_ctx: any,
	_node: ZWaveNode & {
		manufacturerId: number;
		productType: number;
		productId: number;
		firmwareVersion: string;
	},
): Promise<void> {
	// TODO: Actually do something
	// We removed Sentry as it wasn't really useful

	// const configFingerprint = `${formatId(node.manufacturerId)}:${
	// 	formatId(
	// 		node.productType,
	// 	)
	// }:${formatId(node.productId)}:${node.firmwareVersion}`;

	// // We used to get a LOT of false positives, so we should check with our device
	// // database whether this config file is actually unknown

	// // If we tried to report this file earlier, we can skip the report
	// if (missingDeviceConfigCache.has(configFingerprint)) return;
	// // Otherwise ask our device DB if it exists
	// const { default: ky } = await import("ky");
	// try {
	// 	const data = await ky
	// 		.get(
	// 			`https://devices.zwave-js.io/public_api/getdeviceinfo/${configFingerprint.replace(
	// 				/:/g,
	// 				"/",
	// 			)}`,
	// 		)
	// 		.json();

	// 	if (
	// 		isObject(data)
	// 		&& typeof data.deviceFound === "boolean"
	// 		&& data.deviceFound
	// 	) {
	// 		// This is a false positive - remember it
	// 		missingDeviceConfigCache.add(configFingerprint);
	// 		return;
	// 	}
	// } catch (e) {
	// 	// didn't work, try again next time
	// 	return;
	// }

	// const message = `Missing device config: ${configFingerprint}`;

	// const deviceInfo: Record<string, any> = {
	// 	supportsConfigCCV3:
	// 		node.getCCVersion(CommandClasses.Configuration) >= 3,
	// 	supportsAGI: node.supportsCC(
	// 		CommandClasses["Association Group Information"],
	// 	),
	// 	supportsZWavePlus: node.supportsCC(CommandClasses["Z-Wave Plus Info"]),
	// };
	// try {
	// 	if (deviceInfo.supportsConfigCCV3) {
	// 		// Try to collect all info about config params we can get
	// 		const instance = node.createCCInstanceUnsafe(ConfigurationCC)!;
	// 		deviceInfo.parameters = instance.getQueriedParamInfos(applHost);
	// 	}
	// 	if (deviceInfo.supportsAGI) {
	// 		// Try to collect all info about association groups we can get
	// 		const associationGroupCount = AssociationGroupInfoCC[
	// 			"getAssociationGroupCountCached"
	// 		](applHost, node);
	// 		const names: string[] = [];
	// 		for (let group = 1; group <= associationGroupCount; group++) {
	// 			names.push(
	// 				AssociationGroupInfoCC.getGroupNameCached(
	// 					applHost,
	// 					node,
	// 					group,
	// 				) ?? "",
	// 			);
	// 		}
	// 		deviceInfo.associationGroups = names;
	// 	}
	// 	if (deviceInfo.supportsZWavePlus) {
	// 		deviceInfo.zWavePlusVersion = node.zwavePlusVersion;
	// 	}
	// } catch {
	// 	// Don't fail on the last meters :)
	// }

	// // TODO: Actually report somewhere

	// // Remember that we reported the config
	// missingDeviceConfigCache.add(configFingerprint);
}
