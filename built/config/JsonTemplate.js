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
exports.readJsonWithTemplate = exports.clearTemplateCache = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const fs = __importStar(require("fs-extra"));
const json5_1 = __importDefault(require("json5"));
const path = __importStar(require("path"));
const IMPORT_KEY = "$import";
const importSpecifierRegex = /^(?<filename>(?:~\/)?[\w\d\/\\\._-]+\.json)?(?:#(?<selector>[\w\d\/\._-]+(?:\[0x[0-9a-fA-F]+\])?))?$/i;
// The template cache is used to speed up cases where the same files get parsed multiple times,
// e.g. during config file linting. It should be cleared whenever the files need to be loaded fresh
// from disk, like when creating an index
const templateCache = new Map();
function clearTemplateCache() {
    templateCache.clear();
}
exports.clearTemplateCache = clearTemplateCache;
/** Parses a JSON file with $import keys and replaces them with the selected objects */
async function readJsonWithTemplate(filename, rootDir) {
    if (!(await fs.pathExists(filename))) {
        throw new safe_1.ZWaveError(`Could not open config file ${filename}: not found!`, safe_1.ZWaveErrorCodes.Config_NotFound);
    }
    // Try to use the cached versions of the template files to speed up the loading
    const fileCache = new Map(templateCache);
    const ret = await readJsonWithTemplateInternal(filename, undefined, [], fileCache, rootDir);
    // Only remember the cached templates, not the individual files to save RAM
    for (const [filename, cached] of fileCache) {
        if (/[\\/]templates[\\/]/.test(filename)) {
            templateCache.set(filename, cached);
        }
    }
    return ret;
}
exports.readJsonWithTemplate = readJsonWithTemplate;
function assertImportSpecifier(val, source) {
    if (typeof val !== "string") {
        throw new safe_1.ZWaveError(`Invalid import specifier ${String(val)}!${source != undefined ? ` Source: ${source}` : ""}`, safe_1.ZWaveErrorCodes.Config_Invalid);
    }
    if (!importSpecifierRegex.test(val)) {
        throw new safe_1.ZWaveError(`Import specifier "${val}" is invalid!${source != undefined ? ` Source: ${source}` : ""}`, safe_1.ZWaveErrorCodes.Config_Invalid);
    }
}
function getImportSpecifier(filename, selector) {
    let ret = filename;
    if (selector)
        ret += `#${selector}`;
    return ret;
}
function select(obj, selector) {
    let ret = obj;
    const selectorParts = selector.split("/").filter((s) => !!s);
    for (const part of selectorParts) {
        // Special case for paramInformation selectors to select params by #
        if ((0, typeguards_1.isArray)(ret)) {
            const item = ret.find((r) => (0, typeguards_1.isObject)(r) && "#" in r && r["#"] === part);
            if (item != undefined) {
                // Don't copy the param number
                const { ["#"]: _, ...rest } = item;
                ret = rest;
                continue;
            }
        }
        // By default select the object property
        ret = ret[part];
    }
    if (!(0, typeguards_1.isObject)(ret)) {
        throw new safe_1.ZWaveError(`The import target "${selector}" is not an object!`, safe_1.ZWaveErrorCodes.Config_Invalid);
    }
    return ret;
}
function getImportStack(visited, selector) {
    const source = [...visited, selector ? `#${selector}` : undefined]
        .reverse()
        .filter((s) => !!s);
    if (source.length > 0) {
        return `\nImport stack: ${source.map((s) => `\n  in ${s}`).join("")}`;
    }
    return "";
}
async function readJsonWithTemplateInternal(filename, selector, visited, fileCache, rootDir) {
    filename = path.normalize(filename);
    // If we're limited by a root directory, make sure the file is inside that directory
    if (rootDir) {
        const relativeToRoot = path.relative(rootDir, filename);
        if (relativeToRoot.startsWith("..")) {
            throw new safe_1.ZWaveError(`Tried to import config file "${filename}" outside of root directory "${rootDir}"!${getImportStack(visited, selector)}`, safe_1.ZWaveErrorCodes.Config_Invalid);
        }
    }
    const specifier = getImportSpecifier(filename, selector);
    if (visited.includes(specifier)) {
        const msg = `Circular $import in config files: ${[
            ...visited,
            specifier,
        ].join(" -> ")}\n`;
        // process.stderr.write(msg + "\n");
        throw new safe_1.ZWaveError(msg, safe_1.ZWaveErrorCodes.Config_CircularImport);
    }
    let json;
    if (fileCache.has(filename)) {
        json = fileCache.get(filename);
    }
    else {
        try {
            const fileContent = await fs.readFile(filename, "utf8");
            json = json5_1.default.parse(fileContent);
            fileCache.set(filename, json);
        }
        catch (e) {
            throw new safe_1.ZWaveError(`Could not parse config file ${filename}: ${(0, safe_2.getErrorMessage)(e)}${getImportStack(visited, selector)}`, safe_1.ZWaveErrorCodes.Config_Invalid);
        }
    }
    // Resolve the JSON imports for (a subset) of the file and return the compound file
    return resolveJsonImports(selector ? select(json, selector) : json, filename, [...visited, specifier], fileCache, rootDir);
}
/** Replaces all `$import` properties in a JSON object with object spreads of the referenced file/property */
async function resolveJsonImports(json, filename, visited, fileCache, rootDir) {
    const ret = {};
    // Loop through all properties and copy them to the resulting object
    for (const [prop, val] of Object.entries(json)) {
        if (prop === IMPORT_KEY) {
            // This is an import statement. Make sure we're working with a string
            assertImportSpecifier(val, visited.join(" -> "));
            const { filename: importFilename, selector } = importSpecifierRegex.exec(val).groups;
            // Resolve the correct import path
            let newFilename;
            if (importFilename) {
                if (importFilename.startsWith("~/")) {
                    if (rootDir) {
                        newFilename = path.join(rootDir, importFilename.slice(2));
                    }
                    else {
                        throw new safe_1.ZWaveError(`An $import specifier cannot start with ~/ when no root directory is defined!${getImportStack(visited, selector)}`, safe_1.ZWaveErrorCodes.Config_Invalid);
                    }
                }
                else {
                    newFilename = path.join(path.dirname(filename), importFilename);
                }
            }
            else {
                newFilename = filename;
            }
            // const importFilename = path.join(path.dirname(filename), val);
            const imported = await readJsonWithTemplateInternal(newFilename, selector, visited, fileCache, rootDir);
            Object.assign(ret, imported);
        }
        else if ((0, typeguards_1.isObject)(val)) {
            // We're looking at an object, recurse into it
            ret[prop] = await resolveJsonImports(val, filename, visited, fileCache, rootDir);
        }
        else if ((0, typeguards_1.isArray)(val)) {
            // We're looking at an array, check if there are objects we need to recurse into
            const vals = [];
            for (const v of val) {
                if ((0, typeguards_1.isObject)(v)) {
                    vals.push(await resolveJsonImports(v, filename, visited, fileCache, rootDir));
                }
                else {
                    vals.push(v);
                }
            }
            ret[prop] = vals;
        }
        else {
            ret[prop] = val;
        }
    }
    return ret;
}
//# sourceMappingURL=JsonTemplate.js.map