import { getEnumMemberName } from "@zwave-js/shared/safe";
import { padStart } from "alcalzone-shared/strings";
import { Powerlevel } from "../commandclass/_Types";
import type {
	LifelineHealthCheckResult,
	LifelineHealthCheckSummary,
	RouteHealthCheckResult,
	RouteHealthCheckSummary,
} from "./_Types";

export const healthCheckTestFrameCount = 10;

export function healthCheckRatingToWord(rating: number): string {
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

export function formatLifelineHealthCheckRound(
	round: number,
	numRounds: number,
	result: LifelineHealthCheckResult,
): string {
	const ret = [
		`· round ${padStart(
			round.toString(),
			Math.floor(Math.log10(numRounds) + 1),
			" ",
		)} - rating: ${result.rating} (${healthCheckRatingToWord(
			result.rating,
		)})`,
		`  failed pings → node:             ${result.failedPingsNode}/${healthCheckTestFrameCount}`,
		`  max. latency:                    ${result.latency.toFixed(1)} ms`,
		result.routeChanges != undefined
			? `  route changes:                   ${result.routeChanges}`
			: "",
		result.snrMargin != undefined
			? `  SNR margin:                      ${result.snrMargin} dBm`
			: "",
		result.failedPingsController != undefined
			? `  failed pings → controller:       ${result.failedPingsController}/${healthCheckTestFrameCount} at normal power`
			: result.minPowerlevel != undefined
			? `  min. node powerlevel w/o errors: ${getEnumMemberName(
					Powerlevel,
					result.minPowerlevel,
			  )}`
			: "",
	]
		.filter((line) => !!line)
		.join("\n");
	return ret;
}

export function formatLifelineHealthCheckSummary(
	summary: LifelineHealthCheckSummary,
): string {
	return `
rating:                   ${summary.rating} (${healthCheckRatingToWord(
		summary.rating,
	)})
no. of routing neighbors: ${
		summary.results[summary.results.length - 1].numNeighbors
	}
 
Check rounds:
${summary.results
	.map((r, i) =>
		formatLifelineHealthCheckRound(i + 1, summary.results.length, r),
	)
	.join("\n \n")}`.trim();
}

export function formatRouteHealthCheckRound(
	sourceNodeId: number,
	targetNodeId: number,
	round: number,
	numRounds: number,
	result: RouteHealthCheckResult,
): string {
	const ret = [
		`· round ${padStart(
			round.toString(),
			Math.floor(Math.log10(numRounds) + 1),
			" ",
		)} - rating: ${result.rating} (${healthCheckRatingToWord(
			result.rating,
		)})`,
		result.failedPingsToTarget != undefined
			? `  failed pings ${sourceNodeId} → ${targetNodeId}:      ${result.failedPingsToTarget}/${healthCheckTestFrameCount}`
			: result.minPowerlevelSource != undefined
			? `  Node ${sourceNodeId} min. powerlevel w/o errors: ${getEnumMemberName(
					Powerlevel,
					result.minPowerlevelSource,
			  )}`
			: "",
		result.failedPingsToSource != undefined
			? `  failed pings ${targetNodeId} → ${sourceNodeId}:      ${result.failedPingsToSource}/${healthCheckTestFrameCount}`
			: result.minPowerlevelTarget != undefined
			? `  Node ${targetNodeId} min. powerlevel w/o errors: ${getEnumMemberName(
					Powerlevel,
					result.minPowerlevelTarget,
			  )}`
			: "",
	]
		.filter((line) => !!line)
		.join("\n");
	return ret;
}

export function formatRouteHealthCheckSummary(
	sourceNodeId: number,
	targetNodeId: number,
	summary: RouteHealthCheckSummary,
): string {
	return `
rating:                   ${summary.rating} (${healthCheckRatingToWord(
		summary.rating,
	)})
no. of routing neighbors: ${
		summary.results[summary.results.length - 1].numNeighbors
	}
 
Check rounds:
${summary.results
	.map((r, i) =>
		formatRouteHealthCheckRound(
			sourceNodeId,
			targetNodeId,
			i + 1,
			summary.results.length,
			r,
		),
	)
	.join("\n \n")}`.trim();
}
