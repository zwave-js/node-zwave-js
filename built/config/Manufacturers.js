"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveManufacturersInternal = exports.loadManufacturersInternal = void 0;
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const fs_extra_1 = require("fs-extra");
const json5_1 = __importDefault(require("json5"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const utils_safe_1 = require("./utils_safe");
/** @internal */
async function loadManufacturersInternal(externalConfig) {
    const configPath = path_1.default.join((externalConfig && (0, utils_1.externalConfigDir)()) || utils_1.configDir, "manufacturers.json");
    if (!(await (0, fs_extra_1.pathExists)(configPath))) {
        throw new core_1.ZWaveError("The manufacturer config file does not exist!", core_1.ZWaveErrorCodes.Config_Invalid);
    }
    try {
        const fileContents = await (0, fs_extra_1.readFile)(configPath, "utf8");
        const definition = json5_1.default.parse(fileContents);
        if (!(0, typeguards_1.isObject)(definition)) {
            (0, utils_safe_1.throwInvalidConfig)("manufacturers", `the database is not an object!`);
        }
        const manufacturers = new Map();
        for (const [id, name] of Object.entries(definition)) {
            if (!utils_safe_1.hexKeyRegex4Digits.test(id)) {
                (0, utils_safe_1.throwInvalidConfig)("manufacturers", `found invalid key ${id} at the root level. Manufacturer IDs must be hexadecimal lowercase.`);
            }
            if (typeof name !== "string") {
                (0, utils_safe_1.throwInvalidConfig)("manufacturers", `Key ${id} has a non-string manufacturer name`);
            }
            const idNum = parseInt(id.slice(2), 16);
            manufacturers.set(idNum, name);
        }
        return manufacturers;
    }
    catch (e) {
        if ((0, core_1.isZWaveError)(e)) {
            throw e;
        }
        else {
            (0, utils_safe_1.throwInvalidConfig)("manufacturers");
        }
    }
}
exports.loadManufacturersInternal = loadManufacturersInternal;
/**
 * Write current manufacturers map to json
 */
async function saveManufacturersInternal(manufacturers) {
    const data = {};
    const orderedMap = new Map([...manufacturers].sort((a, b) => (a[0] > b[0] ? 1 : -1)));
    for (const [id, name] of orderedMap) {
        data[(0, shared_1.formatId)(id)] = name;
    }
    const configPath = path_1.default.join(utils_1.configDir, "manufacturers.json");
    await (0, fs_extra_1.writeFile)(configPath, (0, shared_1.stringify)(data, "\t") + "\n");
}
exports.saveManufacturersInternal = saveManufacturersInternal;
//# sourceMappingURL=Manufacturers.js.map