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
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-floating-promises */
require("reflect-metadata");
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const c = __importStar(require("ansi-colors"));
const clipboard = __importStar(require("clipboardy"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const yargs = __importStar(require("yargs"));
const ccRegex = /^@commandClass\(CommandClasses(?:\.|\[")(.+?)(?:"\])?\)/m;
const versionRegex = /^@implementedVersion\((\d+)\)/m;
const apiRegex = /^@API\(CommandClasses(?:\.|\[)(.+?)(?:\])?\)/m;
const noApiRegex = /^\/\/ @noAPI/m; // This comment marks a CC that needs no API
const setValueApiRegex = /^\tprotected \[SET_VALUE\]/m;
const noSetValueApiRegex = /^\/\/ @noSetValueAPI/m; // This comment marks a CC that needs no setValue API
const interviewRegex = /^\tpublic async interview/m;
const noInterviewRegex = /^\/\/ @noInterview/m; // This comment marks a CC that needs no interview procedure
const pollValueApiRegex = /^\tprotected \[POLL_VALUE\]/m;
const noPollValueApiRegex = /^\/\/ @noPollValueAPI/m; // This comment marks a CC that needs no pollValue API
const argv = yargs.parseSync();
const onlyIncomplete = !!argv.onlyIncomplete;
function getSafeLength(str) {
    return c.stripColor(str).length;
}
function padEnd(str, len) {
    return str + " ".repeat(len - getSafeLength(str));
}
(async () => {
    const ccDir = path.join(__dirname, "../..", "cc/src/cc");
    const ccFiles = (await fs.readdir(ccDir))
        .filter((file) => file.endsWith(".ts") && !file.endsWith("test.ts"))
        .map((file) => path.join(ccDir, file));
    const allCCs = new Map(Object.keys(core_1.CommandClasses)
        .filter((cc) => Number.isNaN(+cc))
        .map((name) => [
        name,
        {
            version: 0,
            API: false,
            setValue: false,
            pollValue: false,
            interview: false,
        },
    ]));
    for (const ccFile of ccFiles) {
        const fileContent = await fs.readFile(ccFile, "utf8");
        try {
            const ccName = ccRegex.exec(fileContent)[1];
            const ccVersion = +versionRegex.exec(fileContent)[1];
            const hasAPI = apiRegex.test(fileContent) || noApiRegex.test(fileContent);
            const setValue = (hasAPI && setValueApiRegex.test(fileContent)) ||
                noApiRegex.test(fileContent) ||
                noSetValueApiRegex.test(fileContent);
            const pollValue = (hasAPI && pollValueApiRegex.test(fileContent)) ||
                noApiRegex.test(fileContent) ||
                noPollValueApiRegex.test(fileContent);
            const interview = interviewRegex.test(fileContent) ||
                noInterviewRegex.test(fileContent);
            allCCs.set(ccName, {
                version: ccVersion,
                API: hasAPI,
                setValue,
                pollValue,
                interview,
            });
        }
        catch {
            /* ok */
        }
    }
    const headers = [
        "",
        "CC name",
        "Version",
        "Interview?",
        "API?",
        "setValue?",
        "pollValue?",
    ];
    const rows = [];
    for (const [name, { version, interview, API, setValue, pollValue },] of allCCs.entries()) {
        const { version: latest, deprecated, obsolete, } = getLatestVersion(name);
        if (obsolete)
            continue;
        const implementationStatus = version === latest && interview && API && setValue
            ? "done"
            : version > 0
                ? "in progress"
                : "none";
        const overallColor = implementationStatus === "done"
            ? c.green
            : implementationStatus === "in progress"
                ? c.yellow
                : deprecated
                    ? c.reset
                    : c.red;
        const versionColor = version === latest
            ? c.green
            : version > 0
                ? c.yellow
                : deprecated
                    ? c.reset
                    : c.red;
        const implementedVersion = versionColor(version > 0 ? version.toString() : "-");
        const hasInterview = interview ? c.green(" ✔ ") : c.red(" ❌ ");
        const hasAPI = API ? c.green(" ✔ ") : c.red(" ❌ ");
        const hasSetValue = setValue ? c.green(" ✔ ") : c.red(" ❌ ");
        const hasPollValue = pollValue ? c.green(" ✔ ") : c.red(" ❌ ");
        const prefix = implementationStatus === "done"
            ? "✔"
            : implementationStatus === "in progress"
                ? "✍🏻"
                : "❌";
        const postfix = deprecated ? " " + c.reset("(deprecated)") : "";
        if (implementationStatus !== "done" || !onlyIncomplete) {
            rows.push([
                overallColor(prefix),
                overallColor(name + postfix),
                `${implementedVersion} (${latest})`,
                hasInterview,
                hasAPI,
                hasSetValue,
                hasPollValue,
            ]);
        }
    }
    writeTable([headers, ...rows], argv.flavor === "github" ? "github" : "console");
})();
function writeTable(rows, flavor) {
    const numColumns = rows[0].length;
    if (flavor === "console") {
        const columnLenghts = [];
        for (let col = 0; col < numColumns; col++) {
            columnLenghts.push(Math.max(...rows.map((row) => getSafeLength(row[col]))));
        }
        const HR = "|-" +
            columnLenghts.map((len) => "-".repeat(len)).join("-|-") +
            "-|";
        console.log(HR);
        for (let i = 0; i < rows.length; i++) {
            const row = "| " +
                rows[i]
                    .map((r, ri) => padEnd(r, columnLenghts[ri]))
                    .join(" | ") +
                " |";
            console.log(row);
            if (i === 0)
                console.log(HR);
        }
        console.log(HR);
    } /*if (flavor === "github")*/
    else {
        let output = "";
        let HR = "|";
        for (let i = 0; i < numColumns; i++)
            HR += " --- |";
        for (let i = 0; i < rows.length; i++) {
            const row = "| " + rows[i].join(" | ") + " |";
            output += row + "\n";
            if (i === 0)
                output += HR + "\n";
        }
        console.log(output);
        if (!process.env.CI) {
            clipboard.write(c.stripColor(output));
            console.log(c.green("The table was copied to the clipboard!"));
        }
    }
}
// Taken from SDS13548
const ccVersions = {
    "0x9C": { version: 1, deprecated: true },
    "0x9D": { version: 1 },
    "0x5D": { version: 3 },
    "0x7e": { version: 1 },
    "0x22": { version: 1 },
    "0x85": { version: 3 },
    "0x9B": { version: 1 },
    "0x59": { version: 3 },
    "0xA1": { version: 1 },
    "0xA2": { version: 1 },
    "0x66": { version: 1 },
    "0x20": { version: 2 },
    "0x36": { version: 1 },
    "0x80": { version: 3 },
    "0x30": { version: 2, deprecated: true },
    "0x25": { version: 2 },
    "0x46": { version: 1, deprecated: true },
    "0x5B": { version: 3 },
    "0x81": { version: 1 },
    "0x33": { version: 3 },
    "0x70": { version: 4 },
    "0x21": { version: 1 },
    "0x56": { version: 1, deprecated: true },
    "0x3A": { version: 1 },
    "0x3B": { version: 1 },
    "0x5A": { version: 1 },
    "0x62": { version: 4 },
    "0x4C": { version: 1 },
    "0x90": { version: 1 },
    "0x6F": { version: 1 },
    "0x7A": { version: 7 },
    "0xA3": { version: 1 },
    "0x8C": { version: 1 },
    "0x7B": { version: 1, deprecated: true },
    "0x37": { version: 1 },
    "0x39": { version: 1 },
    "0x6D": { version: 2 },
    "0x6E": { version: 1 },
    "0x64": { version: 2 },
    "0x74": { version: 1 },
    "0x87": { version: 4 },
    "0x5C": { version: 1 },
    "0xA0": { version: 1 },
    "0x6B": { version: 1 },
    "0x89": { version: 1 },
    "0x76": { version: 1, deprecated: true },
    "0x69": { version: 2 },
    "0x91": { version: 1 },
    "0x72": { version: 2 },
    "0x32": { version: 6 },
    "0x3C": { version: 1 },
    "0x3D": { version: 3 },
    "0x3E": { version: 1 },
    "0x60": { version: 4 },
    "0x8E": { version: 4 },
    "0x8F": { version: 1 },
    "0x31": { version: 11 },
    "0x26": { version: 4 },
    "0x29": { version: 1, deprecated: true },
    "0x4D": { version: 2 },
    "0x34": { version: 3 },
    "0x67": { version: 2 },
    "0x52": { version: 3 },
    "0x00": { version: 1 },
    "0x77": { version: 1 },
    "0x78": { version: 1 },
    "0x71": { version: 8 },
    "0x73": { version: 1 },
    "0x3F": { version: 1 },
    "0x41": { version: 1 },
    "0x88": { version: 1, deprecated: true },
    "0x75": { version: 2 },
    "0x35": { version: 1, deprecated: true },
    "0x48": { version: 1 },
    "0x49": { version: 1 },
    "0x2B": { version: 1 },
    "0x2C": { version: 1 },
    "0x2D": { version: 1 },
    "0x53": { version: 4 },
    "0x4E": { version: 3, deprecated: true },
    "0x93": { version: 2 },
    "0x92": { version: 2 },
    "0x98": { version: 1 },
    "0x9F": { version: 1 },
    "0x94": { version: 4 },
    "0x79": { version: 2 },
    "0x6C": { version: 2 },
    "0x4A": { version: 1 },
    "0x4B": { version: 1 },
    "0x44": { version: 5 },
    "0x45": { version: 2 },
    "0x40": { version: 3 },
    "0x42": { version: 2 },
    "0x47": { version: 1 },
    "0x43": { version: 3 },
    "0x8A": { version: 2 },
    "0x8B": { version: 1 },
    "0x55": { version: 2 },
    "0x63": { version: 2 },
    "0x86": { version: 3 },
    "0x84": { version: 3 },
    "0x6A": { version: 1 },
    "0x23": { version: 4 },
    "0x4F": { version: 1 },
    "0x5F": { version: 1 },
    "0x68": { version: 1 },
    "0x58": { version: 1 },
    "0x61": { version: 1 },
    "0x5E": { version: 2 },
};
function getLatestVersion(ccName) {
    const cc = core_1.CommandClasses[ccName];
    const version = ccVersions[(0, shared_1.num2hex)(cc, true)];
    if (version == undefined) {
        return { version: 0, obsolete: true };
    }
    return version;
}
//# sourceMappingURL=implementedCCs.js.map