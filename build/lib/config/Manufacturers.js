"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strings_1 = require("alcalzone-shared/strings");
const fs_extra_1 = require("fs-extra");
const JSON5 = require("json5");
const path = require("path");
let manufacturers;
async function loadManufacturers() {
    // TODO: Extract the path resolution
    const fileContents = await fs_extra_1.readFile(path.join(__dirname, "../../../config/manufacturers.json"), "utf8");
    manufacturers = JSON5.parse(fileContents);
}
async function lookupManufacturer(manufacturerID) {
    if (!manufacturers)
        await loadManufacturers();
    const key = "0x" + strings_1.padStart(manufacturerID.toString(16), 4, "0");
    return manufacturers[key];
}
exports.lookupManufacturer = lookupManufacturer;
