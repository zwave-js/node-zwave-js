import { ZWaveDataRate } from "./Protocol.js";

export enum RouteKind {
	None = 0x00,
	/** Last Working Route */
	LWR = 0x01,
	/** Next to Last Working Route */
	NLWR = 0x02,
	/** Application-defined priority route */
	Application = 0x10,
}

export interface Route {
	repeaters: number[];
	routeSpeed: ZWaveDataRate;
}

export const EMPTY_ROUTE: Route = {
	repeaters: [],
	routeSpeed: ZWaveDataRate["9k6"],
};

export function isEmptyRoute(route: Route): boolean {
	return (
		route.repeaters.length === 0
		&& route.routeSpeed === ZWaveDataRate["9k6"]
	);
}

/** How many repeaters can appear in a route */
export const MAX_REPEATERS = 4;
