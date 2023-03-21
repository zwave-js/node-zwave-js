import type { LifelineHealthCheckResult, LifelineHealthCheckSummary, RouteHealthCheckResult, RouteHealthCheckSummary } from "./_Types";
export declare const healthCheckTestFrameCount = 10;
export declare function healthCheckRatingToWord(rating: number): string;
export declare function formatLifelineHealthCheckRound(round: number, numRounds: number, result: LifelineHealthCheckResult): string;
export declare function formatLifelineHealthCheckSummary(summary: LifelineHealthCheckSummary): string;
export declare function formatRouteHealthCheckRound(sourceNodeId: number, targetNodeId: number, round: number, numRounds: number, result: RouteHealthCheckResult): string;
export declare function formatRouteHealthCheckSummary(sourceNodeId: number, targetNodeId: number, summary: RouteHealthCheckSummary): string;
//# sourceMappingURL=HealthCheck.d.ts.map