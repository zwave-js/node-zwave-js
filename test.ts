import { loadDeviceIndexInternal } from "./packages/config/src/Devices";
void (async () => {
	console.time("load");
	await loadDeviceIndexInternal();
	console.timeEnd("load");
})();
