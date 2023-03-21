"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportProblem = void 0;
const ansi_colors_1 = require("ansi-colors");
function reportProblem({ severity, filename, line, message, annotation = !!process.env.CI, }) {
    if (annotation) {
        // Since Github hides the filename in the logs if we use the annotation syntax, we need to write it twice
        console.log(`\n${filename}:`);
        console.log(`::${severity}${severity === "warn" ? "ing" : ""} file=${filename}${line != undefined ? `,line=${line}` : ""}::${message.replace(/\n/g, "%0A")}\n`);
    }
    else {
        console.log(`${filename}${line != undefined ? `:${line}` : ""}:`);
        console.log((severity === "warn" ? ansi_colors_1.yellow : ansi_colors_1.red)(`[${severity.toUpperCase()}] ${message}\n`));
    }
}
exports.reportProblem = reportProblem;
//# sourceMappingURL=reportProblem.js.map