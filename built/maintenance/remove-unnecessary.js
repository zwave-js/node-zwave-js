"use strict";
// Script to remove unnecessary min/maxValue from config files
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@zwave-js/shared");
const JSONC = __importStar(require("comment-json"));
const fs = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const prettier_1 = require("./prettier");
async function main() {
    const devicesDir = path_1.default.join(__dirname, "../../config/config/devices");
    const configFiles = await (0, shared_1.enumFilesRecursive)(devicesDir, (file) => file.endsWith(".json") &&
        !file.endsWith("index.json") &&
        !file.includes("/templates/") &&
        !file.includes("\\templates\\"));
    for (const filename of configFiles) {
        const config = JSONC.parse(await fs.readFile(filename, "utf8"));
        if (!config.paramInformation)
            continue;
        for (const param of config.paramInformation) {
            if (param.allowManualEntry === false &&
                // Avoid false positives through imports
                !("$import" in param) &&
                param.options &&
                param.options.length > 0) {
                if (typeof param.minValue === "number")
                    delete param.minValue;
                if (typeof param.maxValue === "number")
                    delete param.maxValue;
            }
        }
        let output = JSONC.stringify(config, null, "\t");
        output = (0, prettier_1.formatWithPrettier)(filename, output);
        await fs.writeFile(filename, output, "utf8");
    }
}
if (require.main === module) {
    void main();
}
//# sourceMappingURL=remove-unnecessary.js.map