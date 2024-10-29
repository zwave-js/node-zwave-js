import {
	type FLiRS,
	MAX_REPEATERS,
	RouteProtocolDataRate,
	protocolDataRateMask,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";

const ROUTE_SIZE = MAX_REPEATERS + 1;
export const ROUTECACHE_SIZE = 2 * ROUTE_SIZE;
export const EMPTY_ROUTECACHE_FILL = 0xff;
export const emptyRouteCache = new Uint8Array(ROUTECACHE_SIZE)
	.fill(EMPTY_ROUTECACHE_FILL);

enum Beaming {
	"1000ms" = 0x40,
	"250ms" = 0x20,
}

export interface Route {
	beaming: FLiRS;
	protocolRate: RouteProtocolDataRate;
	repeaterNodeIDs?: number[];
}

export interface RouteCache {
	nodeId: number;
	lwr: Route;
	nlwr: Route;
}

export function parseRoute(buffer: Uint8Array, offset: number): Route {
	const routeConf = buffer[offset + MAX_REPEATERS];
	const ret: Route = {
		beaming: (Beaming[routeConf & 0x60] ?? false) as FLiRS,
		protocolRate: routeConf & protocolDataRateMask,
		repeaterNodeIDs: [
			...buffer.subarray(offset, offset + MAX_REPEATERS),
		].filter((id) => id !== 0),
	};
	if (ret.repeaterNodeIDs![0] === 0xfe) delete ret.repeaterNodeIDs;
	return ret;
}

export function encodeRoute(route: Route | undefined): Bytes {
	const ret = new Bytes(ROUTE_SIZE).fill(0);
	if (route) {
		if (route.repeaterNodeIDs) {
			for (
				let i = 0;
				i < MAX_REPEATERS && i < route.repeaterNodeIDs.length;
				i++
			) {
				ret[i] = route.repeaterNodeIDs[i];
			}
		} else {
			ret[0] = 0xfe;
		}
		let routeConf = 0;
		if (route.beaming) routeConf |= Beaming[route.beaming] ?? 0;
		routeConf |= route.protocolRate & protocolDataRateMask;
		ret[ROUTE_SIZE - 1] = routeConf;
	}

	return ret;
}

export function getEmptyRoute(): Route {
	return {
		beaming: false,
		protocolRate: RouteProtocolDataRate.ZWave_40k,
		repeaterNodeIDs: undefined,
	};
}
