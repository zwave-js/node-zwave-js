import { MAX_NODES, MAX_REPEATERS } from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import {
	EMPTY_ROUTECACHE_FILL,
	ROUTECACHE_SIZE,
	type RouteCache,
	emptyRouteCache,
	encodeRoute,
	parseRoute,
} from "../../common/routeCache.js";
import type { NVM3Object } from "../object.js";
import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile.js";

export const ROUTECACHES_PER_FILE_V1 = 8;

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
@nvmSection("protocol")
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

	public serialize(): NVM3Object & { data: Bytes } {
		this.fileId = nodeIdToRouteCacheFileIDV0(this.routeCache.nodeId);
		this.payload = Bytes.concat([
			encodeRoute(this.routeCache.lwr),
			encodeRoute(this.routeCache.nlwr),
		]);
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
		RouteCacheFileV1IDBase
		+ Math.floor((nodeId - 1) / ROUTECACHES_PER_FILE_V1)
	);
}

@nvmFileID(
	(id) =>
		id >= RouteCacheFileV1IDBase
		&& id < RouteCacheFileV1IDBase + MAX_NODES / ROUTECACHES_PER_FILE_V1,
)
@nvmSection("protocol")
export class RouteCacheFileV1 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | RouteCacheFileV1Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.routeCaches = [];
			for (let i = 0; i < ROUTECACHES_PER_FILE_V1; i++) {
				const offset = i * 2 * (MAX_REPEATERS + 1);
				const entry = this.payload.subarray(
					offset,
					offset + 2 * (MAX_REPEATERS + 1),
				);
				if (entry.equals(emptyRouteCache)) continue;

				const nodeId = (this.fileId - RouteCacheFileV1IDBase)
						* ROUTECACHES_PER_FILE_V1
					+ 1
					+ i;
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

	public serialize(): NVM3Object & { data: Bytes } {
		// The route infos must be sorted by node ID
		this.routeCaches.sort((a, b) => a.nodeId - b.nodeId);
		const minNodeId = this.routeCaches[0].nodeId;
		this.fileId = nodeIdToRouteCacheFileIDV1(minNodeId);

		this.payload = new Bytes(ROUTECACHES_PER_FILE_V1 * ROUTECACHE_SIZE)
			.fill(EMPTY_ROUTECACHE_FILL);

		const minFileNodeId =
			Math.floor((minNodeId - 1) / ROUTECACHES_PER_FILE_V1)
				* ROUTECACHES_PER_FILE_V1
			+ 1;

		for (const routeCache of this.routeCaches) {
			const offset = (routeCache.nodeId - minFileNodeId)
				* ROUTECACHE_SIZE;
			const routes = Bytes.concat([
				encodeRoute(routeCache.lwr),
				encodeRoute(routeCache.nlwr),
			]);
			this.payload.set(routes, offset);
		}

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
