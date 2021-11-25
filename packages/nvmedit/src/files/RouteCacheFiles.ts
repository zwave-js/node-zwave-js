import {
	FLiRS,
	MAX_NODES,
	MAX_REPEATERS,
	protocolDataRateMask,
	RouteProtocolDataRate,
} from "@zwave-js/core";
import type { NVMObject } from "../object";
import {
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export const ROUTECACHES_PER_FILE_V1 = 8;

const emptyRouteCache = Buffer.alloc(2 * (MAX_REPEATERS + 1), 0xff);

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

function parseRoute(buffer: Buffer, offset: number): Route {
	const routeConf = buffer[offset + MAX_REPEATERS];
	const ret: Route = {
		beaming: (Beaming[routeConf & 0x60] ?? false) as FLiRS,
		protocolRate: routeConf & protocolDataRateMask,
		repeaterNodeIDs: [
			...buffer.slice(offset, offset + MAX_REPEATERS),
		].filter((id) => id !== 0),
	};
	if (ret.repeaterNodeIDs![0] === 0xfe) delete ret.repeaterNodeIDs;
	return ret;
}

export interface RouteCacheFileV0Options extends NVMFileCreationOptions {
	routeCache: RouteCache;
}

export const RouteCacheFileV0IDBase = 0x50400;
export function nodeIdToRouteCacheFileIDV0(nodeId: number): number {
	return RouteCacheFileV0IDBase + nodeId - 1;
}

@nvmFileID(
	(id) =>
		id >= RouteCacheFileV0IDBase && id < RouteCacheFileV0IDBase + MAX_NODES,
)
export class RouteCacheFileV0 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | RouteCacheFileV0Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			const nodeId = this.fileId - RouteCacheFileV0IDBase + 1;
			const lwr = parseRoute(this.payload, 0);
			const nlwr = parseRoute(this.payload, MAX_REPEATERS + 1);
			this.routeCache = { nodeId, lwr, nlwr };
		} else {
			this.routeCache = options.routeCache;
		}
	}

	public routeCache: RouteCache;

	public serialize(): NVMObject {
		throw new Error("Not implemented");
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			routeCache: this.routeCache,
		};
	}
}

export interface RouteCacheFileV1Options extends NVMFileCreationOptions {
	routeCaches: RouteCache[];
}

export const RouteCacheFileV1IDBase = 0x51400;
export function nodeIdToRouteCacheFileIDV1(nodeId: number): number {
	return (
		RouteCacheFileV1IDBase +
		Math.floor((nodeId - 1) / ROUTECACHES_PER_FILE_V1)
	);
}

@nvmFileID(
	(id) =>
		id >= RouteCacheFileV1IDBase &&
		id < RouteCacheFileV1IDBase + MAX_NODES / ROUTECACHES_PER_FILE_V1,
)
export class RouteCacheFileV1 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | RouteCacheFileV1Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.routeCaches = [];
			for (let i = 0; i < ROUTECACHES_PER_FILE_V1; i++) {
				const offset = i * 2 * (MAX_REPEATERS + 1);
				const entry = this.payload.slice(
					offset,
					offset + 2 * (MAX_REPEATERS + 1),
				);
				if (entry.equals(emptyRouteCache)) continue;

				const nodeId =
					(this.fileId - RouteCacheFileV1IDBase) *
						ROUTECACHES_PER_FILE_V1 +
					1 +
					i;
				const lwr = parseRoute(this.payload, offset);
				const nlwr = parseRoute(
					this.payload,
					offset + MAX_REPEATERS + 1,
				);

				this.routeCaches.push({ nodeId, lwr, nlwr });
			}
		} else {
			this.routeCaches = options.routeCaches;
		}
	}

	public routeCaches: RouteCache[];

	public serialize(): NVMObject {
		throw new Error("Not implemented");
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			"route caches": this.routeCaches,
		};
	}
}
