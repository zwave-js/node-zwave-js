import { FunctionType } from "../../message/Constants";

// Test mock for isFunctionSupported to control which commands are getting used
export function isFunctionSupported_NoBridge(fn: FunctionType): boolean {
	switch (fn) {
		case FunctionType.SendDataBridge:
		case FunctionType.SendDataMulticastBridge:
			return false;
	}
	return true;
}

// Test mock for isFunctionSupported to control which commands are getting used
export function isFunctionSupported_All(): boolean {
	return true;
}
