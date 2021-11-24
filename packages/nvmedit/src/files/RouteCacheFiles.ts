import { MAX_NODES, MAX_REPEATERS } from "@zwave-js/core";
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

export interface Route {
	repeaterNodeIDs: number[];
	confSize: number; // TODO: 🤷🏻‍♂️
}

export interface RouteCache {
	nodeId: number;
	lwr: Route;
	nlwr: Route;
}

function parseRoute(buffer: Buffer, offset: number): Route {
	return {
		repeaterNodeIDs: [...buffer.slice(offset, offset + MAX_REPEATERS)],
		confSize: buffer[offset + MAX_REPEATERS],
	};
}

export interface RouteCacheFileV0Options
	extends NVMFileCreationOptions,
		RouteCache {}

@nvmFileID((id) => id >= 0x50400 && id < 0x50400 + MAX_NODES)
export class RouteCacheFileV0 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | RouteCacheFileV0Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeId = this.fileId - 0x50400 + 1;
			this.lwr = parseRoute(this.payload, 0);
			this.nlwr = parseRoute(this.payload, MAX_REPEATERS + 1);
		} else {
			this.nodeId = options.nodeId;
			this.lwr = options.lwr;
			this.nlwr = options.nlwr;
		}
	}

	public nodeId: number;
	public lwr: Route;
	public nlwr: Route;

	public serialize(): NVMObject {
		throw new Error("Not implemented");
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
		};
	}
}

export interface RouteCacheFileV1Options extends NVMFileCreationOptions {
	routeCaches: RouteCache[];
}

@nvmFileID(
	(id) => id >= 0x51400 && id < 0x51400 + MAX_NODES / ROUTECACHES_PER_FILE_V1,
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
					(this.fileId - 0x51400) * ROUTECACHES_PER_FILE_V1 + 1 + i;
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
