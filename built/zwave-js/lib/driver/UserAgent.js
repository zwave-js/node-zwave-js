"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAgentComponentsToString = exports.mergeUserAgent = void 0;
function mergeUserAgent(existingComponents, additionalComponents, allowOverwrite = false) {
    const ret = new Map(existingComponents);
    // Remove everything that's not a letter, number, . or -
    function normalize(str) {
        return str.replace(/[^a-zA-Z0-9\.\-]/g, "");
    }
    for (let [name, version] of Object.entries(additionalComponents)) {
        name = normalize(name);
        if (name === "node-zwave-js")
            continue;
        if (!allowOverwrite && ret.has(name))
            continue;
        if (version == undefined) {
            ret.delete(name);
        }
        else {
            version = normalize(version);
            ret.set(name, version);
        }
    }
    return ret;
}
exports.mergeUserAgent = mergeUserAgent;
function userAgentComponentsToString(components) {
    return [...components]
        .map(([name, version]) => `${name}/${version}`)
        .join(" ");
}
exports.userAgentComponentsToString = userAgentComponentsToString;
//# sourceMappingURL=UserAgent.js.map