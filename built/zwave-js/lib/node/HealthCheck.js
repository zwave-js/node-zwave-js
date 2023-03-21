"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRouteHealthCheckSummary = exports.formatRouteHealthCheckRound = exports.formatLifelineHealthCheckSummary = exports.formatLifelineHealthCheckRound = exports.healthCheckRatingToWord = exports.healthCheckTestFrameCount = void 0;
const safe_1 = require("@zwave-js/cc/safe");
const safe_2 = require("@zwave-js/shared/safe");
const strings_1 = require("alcalzone-shared/strings");
exports.healthCheckTestFrameCount = 10;
function healthCheckRatingToWord(rating) {
    return rating >= 10
        ? "perfect"
        : rating >= 6
            ? "good"
            : rating >= 4
                ? "acceptable"
                : rating >= 1
                    ? "bad"
                    : "dead";
}
exports.healthCheckRatingToWord = healthCheckRatingToWord;
function formatLifelineHealthCheckRound(round, numRounds, result) {
    const ret = [
        `· round ${(0, strings_1.padStart)(round.toString(), Math.floor(Math.log10(numRounds) + 1), " ")} - rating: ${result.rating} (${healthCheckRatingToWord(result.rating)})`,
        `  failed pings → node:             ${result.failedPingsNode}/${exports.healthCheckTestFrameCount}`,
        `  max. latency:                    ${result.latency.toFixed(1)} ms`,
        result.routeChanges != undefined
            ? `  route changes:                   ${result.routeChanges}`
            : "",
        result.snrMargin != undefined
            ? `  SNR margin:                      ${result.snrMargin} dBm`
            : "",
        result.failedPingsController != undefined
            ? `  failed pings → controller:       ${result.failedPingsController}/${exports.healthCheckTestFrameCount} at normal power`
            : result.minPowerlevel != undefined
                ? `  min. node powerlevel w/o errors: ${(0, safe_2.getEnumMemberName)(safe_1.Powerlevel, result.minPowerlevel)}`
                : "",
    ]
        .filter((line) => !!line)
        .join("\n");
    return ret;
}
exports.formatLifelineHealthCheckRound = formatLifelineHealthCheckRound;
function formatLifelineHealthCheckSummary(summary) {
    return `
rating:                   ${summary.rating} (${healthCheckRatingToWord(summary.rating)})
no. of routing neighbors: ${summary.results[summary.results.length - 1].numNeighbors}
 
Check rounds:
${summary.results
        .map((r, i) => formatLifelineHealthCheckRound(i + 1, summary.results.length, r))
        .join("\n \n")}`.trim();
}
exports.formatLifelineHealthCheckSummary = formatLifelineHealthCheckSummary;
function formatRouteHealthCheckRound(sourceNodeId, targetNodeId, round, numRounds, result) {
    const ret = [
        `· round ${(0, strings_1.padStart)(round.toString(), Math.floor(Math.log10(numRounds) + 1), " ")} - rating: ${result.rating} (${healthCheckRatingToWord(result.rating)})`,
        result.failedPingsToTarget != undefined
            ? `  failed pings ${sourceNodeId} → ${targetNodeId}:      ${result.failedPingsToTarget}/${exports.healthCheckTestFrameCount}`
            : result.minPowerlevelSource != undefined
                ? `  Node ${sourceNodeId} min. powerlevel w/o errors: ${(0, safe_2.getEnumMemberName)(safe_1.Powerlevel, result.minPowerlevelSource)}`
                : "",
        result.failedPingsToSource != undefined
            ? `  failed pings ${targetNodeId} → ${sourceNodeId}:      ${result.failedPingsToSource}/${exports.healthCheckTestFrameCount}`
            : result.minPowerlevelTarget != undefined
                ? `  Node ${targetNodeId} min. powerlevel w/o errors: ${(0, safe_2.getEnumMemberName)(safe_1.Powerlevel, result.minPowerlevelTarget)}`
                : "",
    ]
        .filter((line) => !!line)
        .join("\n");
    return ret;
}
exports.formatRouteHealthCheckRound = formatRouteHealthCheckRound;
function formatRouteHealthCheckSummary(sourceNodeId, targetNodeId, summary) {
    return `
rating:                   ${summary.rating} (${healthCheckRatingToWord(summary.rating)})
no. of routing neighbors: ${summary.results[summary.results.length - 1].numNeighbors}
 
Check rounds:
${summary.results
        .map((r, i) => formatRouteHealthCheckRound(sourceNodeId, targetNodeId, i + 1, summary.results.length, r))
        .join("\n \n")}`.trim();
}
exports.formatRouteHealthCheckSummary = formatRouteHealthCheckSummary;
//# sourceMappingURL=HealthCheck.js.map