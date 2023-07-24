import type { ZWaveNode } from "zwave-js";
import { useDriver } from "./useDriver.js";

export function useZWaveNode(id: number): ZWaveNode | undefined {
	const { driver } = useDriver();
	if (!driver.ready) return;
	return driver.controller.nodes.get(id);
}
