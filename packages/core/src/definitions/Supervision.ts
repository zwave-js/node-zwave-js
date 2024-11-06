import { isObject } from "alcalzone-shared/typeguards";
import { Duration } from "../values/Duration.js";

export enum SupervisionStatus {
	NoSupport = 0x00,
	Working = 0x01,
	Fail = 0x02,
	Success = 0xff,
}

export type SupervisionResult =
	| {
		status:
			| SupervisionStatus.NoSupport
			| SupervisionStatus.Fail
			| SupervisionStatus.Success;
		remainingDuration?: undefined;
	}
	| {
		status: SupervisionStatus.Working;
		remainingDuration: Duration;
	};

export type SupervisionUpdateHandler = (update: SupervisionResult) => void;

export function isSupervisionResult(obj: unknown): obj is SupervisionResult {
	return (
		isObject(obj)
		&& "status" in obj
		&& typeof SupervisionStatus[obj.status as any] === "string"
	);
}

export function supervisedCommandSucceeded(
	result: unknown,
): result is SupervisionResult & {
	status: SupervisionStatus.Success | SupervisionStatus.Working;
} {
	return (
		isSupervisionResult(result)
		&& (result.status === SupervisionStatus.Success
			|| result.status === SupervisionStatus.Working)
	);
}

export function supervisedCommandFailed(
	result: unknown,
): result is SupervisionResult & {
	status: SupervisionStatus.Fail | SupervisionStatus.NoSupport;
} {
	return (
		isSupervisionResult(result)
		&& (result.status === SupervisionStatus.Fail
			|| result.status === SupervisionStatus.NoSupport)
	);
}

export function isUnsupervisedOrSucceeded(
	result: SupervisionResult | undefined,
): result is
	| undefined
	| (SupervisionResult & {
		status: SupervisionStatus.Success | SupervisionStatus.Working;
	})
{
	return !result || supervisedCommandSucceeded(result);
}

/** Figures out the final supervision result from an array of things that may be supervision results */
export function mergeSupervisionResults(
	results: unknown[],
): SupervisionResult | undefined {
	const supervisionResults = results.filter(isSupervisionResult);
	if (!supervisionResults.length) return undefined;

	if (supervisionResults.some((r) => r.status === SupervisionStatus.Fail)) {
		return {
			status: SupervisionStatus.Fail,
		};
	} else if (
		supervisionResults.some((r) => r.status === SupervisionStatus.NoSupport)
	) {
		return {
			status: SupervisionStatus.NoSupport,
		};
	}
	const working = supervisionResults.filter(
		(r): r is SupervisionResult & { status: SupervisionStatus.Working } =>
			r.status === SupervisionStatus.Working,
	);
	if (working.length > 0) {
		const durations = working.map((r) =>
			r.remainingDuration.serializeSet()
		);
		const maxDuration = (durations.length > 0
			&& Duration.parseReport(Math.max(...durations)))
			|| Duration.unknown();
		return {
			status: SupervisionStatus.Working,
			remainingDuration: maxDuration,
		};
	}
	return {
		status: SupervisionStatus.Success,
	};
}

export const MAX_SUPERVISION_SESSION_ID = 0b111111;
