"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNVMMeta = exports.encodeNVM = exports.parseNVM = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const consts_1 = require("./consts");
const object_1 = require("./object");
const page_1 = require("./page");
const utils_1 = require("./utils");
function comparePages(p1, p2) {
    if (p1.header.eraseCount === p2.header.eraseCount) {
        return p1.header.offset - p2.header.offset;
    }
    else {
        return p1.header.eraseCount - p2.header.eraseCount;
    }
}
function parseNVM(buffer, verbose = false) {
    let offset = 0;
    const pages = [];
    while (offset < buffer.length) {
        const { page, bytesRead } = (0, page_1.readPage)(buffer, offset);
        if (verbose)
            (0, utils_1.dumpPage)(page);
        pages.push(page);
        offset += bytesRead;
    }
    const applicationPages = pages.filter((p) => p.header.offset < consts_1.ZWAVE_APPLICATION_NVM_SIZE);
    const protocolPages = pages.filter((p) => p.header.offset >= consts_1.ZWAVE_APPLICATION_NVM_SIZE);
    // The pages are written in a ring buffer, find the one with the lowest erase count and start reading from there in order
    applicationPages.sort(comparePages);
    protocolPages.sort(comparePages);
    // Build a compressed view of the NVM objects
    const applicationObjects = (0, object_1.compressObjects)(applicationPages.reduce((acc, page) => acc.concat(page.objects), []));
    const protocolObjects = (0, object_1.compressObjects)(protocolPages.reduce((acc, page) => acc.concat(page.objects), []));
    if (verbose) {
        console.log();
        console.log();
        console.log("Application objects:");
        applicationObjects.forEach((obj) => (0, utils_1.dumpObject)(obj, true));
        console.log();
        console.log("Protocol objects:");
        protocolObjects.forEach((obj) => (0, utils_1.dumpObject)(obj, true));
    }
    return {
        applicationPages,
        protocolPages,
        applicationObjects,
        protocolObjects,
    };
}
exports.parseNVM = parseNVM;
function encodeNVM(
/** A compressed map of application-level NVM objects */
applicationObjects, 
/** A compressed map of protocol-level NVM objects */
protocolObjects, options) {
    const { deviceFamily = 2047, writeSize = consts_1.PageWriteSize.WRITE_SIZE_16, memoryMapped = true, } = options ?? {};
    const pageSize = Math.min(options?.pageSize ?? consts_1.FLASH_MAX_PAGE_SIZE, consts_1.FLASH_MAX_PAGE_SIZE);
    const createEmptyPage = () => {
        const ret = Buffer.alloc(pageSize, 0xff);
        (0, page_1.writePageHeader)({
            version: 0x01,
            eraseCount: 0,
            encrypted: false,
            deviceFamily,
            memoryMapped,
            pageSize,
            status: consts_1.PageStatus.OK,
            writeSize,
        }).copy(ret, 0);
        return ret;
    };
    const applicationPages = [];
    for (let i = 0; i < consts_1.ZWAVE_APPLICATION_NVM_SIZE / pageSize; i++) {
        applicationPages.push(createEmptyPage());
    }
    const protocolPages = [];
    for (let i = 0; i < consts_1.ZWAVE_PROTOCOL_NVM_SIZE / pageSize; i++) {
        protocolPages.push(createEmptyPage());
    }
    const writeObjects = (pages, objects) => {
        // Keep track where we are at with writing in the pages
        let pageIndex = -1;
        let offsetInPage = -1;
        let remainingSpace = -1;
        let currentPage;
        const nextPage = () => {
            pageIndex++;
            if (pageIndex >= pages.length) {
                throw new safe_1.ZWaveError("Not enough pages!", safe_1.ZWaveErrorCodes.NVM_NoSpace);
            }
            currentPage = pages[pageIndex];
            offsetInPage = consts_1.NVM3_PAGE_HEADER_SIZE;
            remainingSpace = pageSize - offsetInPage;
        };
        const incrementOffset = (by) => {
            const alignedDelta = (by + consts_1.NVM3_WORD_SIZE - 1) & ~(consts_1.NVM3_WORD_SIZE - 1);
            offsetInPage += alignedDelta;
            remainingSpace = pageSize - offsetInPage;
        };
        nextPage();
        for (const obj of objects.values()) {
            let fragments;
            if (obj.type === consts_1.ObjectType.Deleted)
                continue;
            if ((obj.type === consts_1.ObjectType.CounterSmall &&
                remainingSpace <
                    consts_1.NVM3_OBJ_HEADER_SIZE_SMALL + consts_1.NVM3_COUNTER_SIZE) ||
                (obj.type === consts_1.ObjectType.DataSmall &&
                    remainingSpace <
                        consts_1.NVM3_OBJ_HEADER_SIZE_SMALL + (obj.data?.length ?? 0))) {
                // Small objects cannot be fragmented and need to go on the next page
                nextPage();
            }
            else if (obj.type === consts_1.ObjectType.CounterLarge ||
                obj.type === consts_1.ObjectType.DataLarge) {
                // Large objects may be fragmented
                fragments = (0, object_1.fragmentLargeObject)(obj, remainingSpace, pageSize - consts_1.NVM3_PAGE_HEADER_SIZE);
            }
            if (!fragments)
                fragments = [obj];
            for (const fragment of fragments) {
                const objBuffer = (0, object_1.writeObject)(fragment);
                objBuffer.copy(currentPage, offsetInPage);
                incrementOffset(objBuffer.length);
                // Each following fragment needs to be written to a different page^
                if (fragments.length > 1)
                    nextPage();
            }
        }
    };
    writeObjects(applicationPages, applicationObjects);
    writeObjects(protocolPages, protocolObjects);
    return Buffer.concat([...applicationPages, ...protocolPages]);
}
exports.encodeNVM = encodeNVM;
function getNVMMeta(page) {
    return (0, safe_2.pick)(page.header, [
        "pageSize",
        "writeSize",
        "memoryMapped",
        "deviceFamily",
    ]);
}
exports.getNVMMeta = getNVMMeta;
//# sourceMappingURL=nvm.js.map