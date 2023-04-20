"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUCUpdateEntriesFileV5 = exports.sucUpdateIndexToSUCUpdateEntriesFileIDV5 = exports.SUCUpdateEntriesFileV5IDBase = exports.SUCUpdateEntriesFileIDV0 = exports.SUCUpdateEntriesFileV0 = exports.encodeSUCUpdateEntry = exports.parseSUCUpdateEntry = exports.SUC_UPDATES_PER_FILE_V5 = void 0;
const safe_1 = require("@zwave-js/core/safe");
const consts_1 = require("../consts");
const NVMFile_1 = require("./NVMFile");
exports.SUC_UPDATES_PER_FILE_V5 = 8;
function parseSUCUpdateEntry(buffer, offset) {
    const slice = buffer.slice(offset, offset + consts_1.SUC_UPDATE_ENTRY_SIZE);
    if (slice.every((b) => b === 0x00 || b === 0xff)) {
        return;
    }
    const nodeId = slice[0];
    const changeType = slice[1];
    const { supportedCCs, controlledCCs } = (0, safe_1.parseCCList)(slice.slice(2, consts_1.SUC_UPDATE_ENTRY_SIZE));
    return {
        nodeId,
        changeType,
        supportedCCs: supportedCCs.filter((cc) => cc > 0),
        controlledCCs: controlledCCs.filter((cc) => cc > 0),
    };
}
exports.parseSUCUpdateEntry = parseSUCUpdateEntry;
function encodeSUCUpdateEntry(entry) {
    const ret = Buffer.alloc(consts_1.SUC_UPDATE_ENTRY_SIZE, 0);
    if (entry) {
        ret[0] = entry.nodeId;
        ret[1] = entry.changeType;
        const ccList = (0, safe_1.encodeCCList)(entry.supportedCCs, entry.controlledCCs);
        if (ccList.length > consts_1.SUC_UPDATE_NODEPARM_MAX) {
            throw new safe_1.ZWaveError("Cannot encode SUC update entry, too many CCs", safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        ccList.copy(ret, 2);
    }
    return ret;
}
exports.encodeSUCUpdateEntry = encodeSUCUpdateEntry;
let SUCUpdateEntriesFileV0 = class SUCUpdateEntriesFileV0 extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.updateEntries = [];
            for (let entry = 0; entry < consts_1.SUC_MAX_UPDATES; entry++) {
                const offset = entry * consts_1.SUC_UPDATE_ENTRY_SIZE;
                const updateEntry = parseSUCUpdateEntry(this.payload, offset);
                if (updateEntry)
                    this.updateEntries.push(updateEntry);
            }
        }
        else {
            this.updateEntries = options.updateEntries;
        }
    }
    serialize() {
        this.payload = Buffer.alloc(consts_1.SUC_MAX_UPDATES * consts_1.SUC_UPDATE_ENTRY_SIZE, 0);
        for (let i = 0; i < this.updateEntries.length; i++) {
            const offset = i * consts_1.SUC_UPDATE_ENTRY_SIZE;
            const entry = this.updateEntries[i];
            encodeSUCUpdateEntry(entry).copy(this.payload, offset);
        }
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            "SUC update entries": this.updateEntries,
        };
    }
};
SUCUpdateEntriesFileV0 = __decorate([
    (0, NVMFile_1.nvmFileID)(0x50003)
], SUCUpdateEntriesFileV0);
exports.SUCUpdateEntriesFileV0 = SUCUpdateEntriesFileV0;
exports.SUCUpdateEntriesFileIDV0 = (0, NVMFile_1.getNVMFileIDStatic)(SUCUpdateEntriesFileV0);
exports.SUCUpdateEntriesFileV5IDBase = 0x54000;
function sucUpdateIndexToSUCUpdateEntriesFileIDV5(index) {
    return (exports.SUCUpdateEntriesFileV5IDBase +
        Math.floor(index / exports.SUC_UPDATES_PER_FILE_V5));
}
exports.sucUpdateIndexToSUCUpdateEntriesFileIDV5 = sucUpdateIndexToSUCUpdateEntriesFileIDV5;
let SUCUpdateEntriesFileV5 = class SUCUpdateEntriesFileV5 extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.updateEntries = [];
            for (let entry = 0; entry < exports.SUC_UPDATES_PER_FILE_V5; entry++) {
                const offset = entry * consts_1.SUC_UPDATE_ENTRY_SIZE;
                const updateEntry = parseSUCUpdateEntry(this.payload, offset);
                if (updateEntry)
                    this.updateEntries.push(updateEntry);
            }
        }
        else {
            this.updateEntries = options.updateEntries;
        }
    }
    serialize() {
        this.payload = Buffer.alloc(exports.SUC_UPDATES_PER_FILE_V5 * consts_1.SUC_UPDATE_ENTRY_SIZE, 0xff);
        for (let i = 0; i < this.updateEntries.length; i++) {
            const offset = i * consts_1.SUC_UPDATE_ENTRY_SIZE;
            const entry = this.updateEntries[i];
            encodeSUCUpdateEntry(entry).copy(this.payload, offset);
        }
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            "SUC update entries": this.updateEntries,
        };
    }
};
SUCUpdateEntriesFileV5 = __decorate([
    (0, NVMFile_1.nvmFileID)((id) => id >= exports.SUCUpdateEntriesFileV5IDBase &&
        id <
            exports.SUCUpdateEntriesFileV5IDBase +
                consts_1.SUC_MAX_UPDATES / exports.SUC_UPDATES_PER_FILE_V5)
], SUCUpdateEntriesFileV5);
exports.SUCUpdateEntriesFileV5 = SUCUpdateEntriesFileV5;
//# sourceMappingURL=SUCUpdateEntriesFile.js.map