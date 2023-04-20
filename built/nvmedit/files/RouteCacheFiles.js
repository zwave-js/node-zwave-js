"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteCacheFileV1 = exports.nodeIdToRouteCacheFileIDV1 = exports.RouteCacheFileV1IDBase = exports.RouteCacheFileV0 = exports.nodeIdToRouteCacheFileIDV0 = exports.RouteCacheFileV0IDBase = exports.getEmptyRoute = exports.encodeRoute = exports.parseRoute = exports.ROUTECACHES_PER_FILE_V1 = void 0;
const safe_1 = require("@zwave-js/core/safe");
const NVMFile_1 = require("./NVMFile");
exports.ROUTECACHES_PER_FILE_V1 = 8;
const ROUTE_SIZE = safe_1.MAX_REPEATERS + 1;
const ROUTECACHE_SIZE = 2 * ROUTE_SIZE;
const EMPTY_ROUTECACHE_FILL = 0xff;
const emptyRouteCache = Buffer.alloc(ROUTECACHE_SIZE, EMPTY_ROUTECACHE_FILL);
var Beaming;
(function (Beaming) {
    Beaming[Beaming["1000ms"] = 64] = "1000ms";
    Beaming[Beaming["250ms"] = 32] = "250ms";
})(Beaming || (Beaming = {}));
function parseRoute(buffer, offset) {
    const routeConf = buffer[offset + safe_1.MAX_REPEATERS];
    const ret = {
        beaming: (Beaming[routeConf & 0x60] ?? false),
        protocolRate: routeConf & safe_1.protocolDataRateMask,
        repeaterNodeIDs: [
            ...buffer.slice(offset, offset + safe_1.MAX_REPEATERS),
        ].filter((id) => id !== 0),
    };
    if (ret.repeaterNodeIDs[0] === 0xfe)
        delete ret.repeaterNodeIDs;
    return ret;
}
exports.parseRoute = parseRoute;
function encodeRoute(route) {
    const ret = Buffer.alloc(ROUTE_SIZE, 0);
    if (route) {
        if (route.repeaterNodeIDs) {
            for (let i = 0; i < safe_1.MAX_REPEATERS && i < route.repeaterNodeIDs.length; i++) {
                ret[i] = route.repeaterNodeIDs[i];
            }
        }
        else {
            ret[0] = 0xfe;
        }
        let routeConf = 0;
        if (route.beaming)
            routeConf |= Beaming[route.beaming] ?? 0;
        routeConf |= route.protocolRate & safe_1.protocolDataRateMask;
        ret[ROUTE_SIZE - 1] = routeConf;
    }
    return ret;
}
exports.encodeRoute = encodeRoute;
function getEmptyRoute() {
    return {
        beaming: false,
        protocolRate: safe_1.RouteProtocolDataRate.ZWave_40k,
        repeaterNodeIDs: undefined,
    };
}
exports.getEmptyRoute = getEmptyRoute;
exports.RouteCacheFileV0IDBase = 0x50400;
function nodeIdToRouteCacheFileIDV0(nodeId) {
    return exports.RouteCacheFileV0IDBase + nodeId - 1;
}
exports.nodeIdToRouteCacheFileIDV0 = nodeIdToRouteCacheFileIDV0;
let RouteCacheFileV0 = class RouteCacheFileV0 extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            const nodeId = this.fileId - exports.RouteCacheFileV0IDBase + 1;
            const lwr = parseRoute(this.payload, 0);
            const nlwr = parseRoute(this.payload, safe_1.MAX_REPEATERS + 1);
            this.routeCache = { nodeId, lwr, nlwr };
        }
        else {
            this.routeCache = options.routeCache;
        }
    }
    serialize() {
        this.fileId = nodeIdToRouteCacheFileIDV0(this.routeCache.nodeId);
        this.payload = Buffer.concat([
            encodeRoute(this.routeCache.lwr),
            encodeRoute(this.routeCache.nlwr),
        ]);
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            routeCache: this.routeCache,
        };
    }
};
RouteCacheFileV0 = __decorate([
    (0, NVMFile_1.nvmFileID)((id) => id >= exports.RouteCacheFileV0IDBase && id < exports.RouteCacheFileV0IDBase + safe_1.MAX_NODES)
], RouteCacheFileV0);
exports.RouteCacheFileV0 = RouteCacheFileV0;
exports.RouteCacheFileV1IDBase = 0x51400;
function nodeIdToRouteCacheFileIDV1(nodeId) {
    return (exports.RouteCacheFileV1IDBase +
        Math.floor((nodeId - 1) / exports.ROUTECACHES_PER_FILE_V1));
}
exports.nodeIdToRouteCacheFileIDV1 = nodeIdToRouteCacheFileIDV1;
let RouteCacheFileV1 = class RouteCacheFileV1 extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.routeCaches = [];
            for (let i = 0; i < exports.ROUTECACHES_PER_FILE_V1; i++) {
                const offset = i * 2 * (safe_1.MAX_REPEATERS + 1);
                const entry = this.payload.slice(offset, offset + 2 * (safe_1.MAX_REPEATERS + 1));
                if (entry.equals(emptyRouteCache))
                    continue;
                const nodeId = (this.fileId - exports.RouteCacheFileV1IDBase) *
                    exports.ROUTECACHES_PER_FILE_V1 +
                    1 +
                    i;
                const lwr = parseRoute(this.payload, offset);
                const nlwr = parseRoute(this.payload, offset + safe_1.MAX_REPEATERS + 1);
                this.routeCaches.push({ nodeId, lwr, nlwr });
            }
        }
        else {
            this.routeCaches = options.routeCaches;
        }
    }
    serialize() {
        // The route infos must be sorted by node ID
        this.routeCaches.sort((a, b) => a.nodeId - b.nodeId);
        const minNodeId = this.routeCaches[0].nodeId;
        this.fileId = nodeIdToRouteCacheFileIDV1(minNodeId);
        this.payload = Buffer.alloc(exports.ROUTECACHES_PER_FILE_V1 * ROUTECACHE_SIZE, EMPTY_ROUTECACHE_FILL);
        const minFileNodeId = Math.floor((minNodeId - 1) / exports.ROUTECACHES_PER_FILE_V1) *
            exports.ROUTECACHES_PER_FILE_V1 +
            1;
        for (const routeCache of this.routeCaches) {
            const offset = (routeCache.nodeId - minFileNodeId) * ROUTECACHE_SIZE;
            Buffer.concat([
                encodeRoute(routeCache.lwr),
                encodeRoute(routeCache.nlwr),
            ]).copy(this.payload, offset);
        }
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            "route caches": this.routeCaches,
        };
    }
};
RouteCacheFileV1 = __decorate([
    (0, NVMFile_1.nvmFileID)((id) => id >= exports.RouteCacheFileV1IDBase &&
        id < exports.RouteCacheFileV1IDBase + safe_1.MAX_NODES / exports.ROUTECACHES_PER_FILE_V1)
], RouteCacheFileV1);
exports.RouteCacheFileV1 = RouteCacheFileV1;
//# sourceMappingURL=RouteCacheFiles.js.map