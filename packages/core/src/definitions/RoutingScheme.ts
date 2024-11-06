import { num2hex } from "@zwave-js/shared/safe";

/**
 * How the controller transmitted a frame to a node.
 */

export enum RoutingScheme {
	Idle,
	Direct,
	Priority,
	LWR,
	NLWR,
	Auto,
	ResortDirect,
	Explore,
}
/**
 * Converts a routing scheme value to a human readable format.
 */

export function routingSchemeToString(scheme: RoutingScheme): string {
	switch (scheme) {
		case RoutingScheme.Idle:
			return "Idle";
		case RoutingScheme.Direct:
			return "Direct";
		case RoutingScheme.Priority:
			return "Priority Route";
		case RoutingScheme.LWR:
			return "LWR";
		case RoutingScheme.NLWR:
			return "NLWR";
		case RoutingScheme.Auto:
			return "Auto Route";
		case RoutingScheme.ResortDirect:
			return "Resort to Direct";
		case RoutingScheme.Explore:
			return "Explorer Frame";
		default:
			return `Unknown (${num2hex(scheme)})`;
	}
}
