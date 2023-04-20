"use strict";
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
exports.enumFilesRecursive = void 0;
const fs = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const _1 = require(".");
async function enumFilesRecursive(rootDir, predicate) {
    const ret = [];
    try {
        const filesAndDirs = await fs.readdir(rootDir);
        for (const f of filesAndDirs) {
            const fullPath = path_1.default.join(rootDir, f);
            if (fs.statSync(fullPath).isDirectory()) {
                ret.push(...(await enumFilesRecursive(fullPath, predicate)));
            }
            else if (predicate?.(fullPath)) {
                ret.push(fullPath);
            }
        }
    }
    catch (e) {
        console.error(`Cannot read directory: "${rootDir}": ${(0, _1.getErrorMessage)(e, true)}`);
    }
    return ret;
}
exports.enumFilesRecursive = enumFilesRecursive;
//# sourceMappingURL=fs.js.map