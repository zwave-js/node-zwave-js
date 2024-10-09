import { type EventHandler } from "@zwave-js/shared";
import { type StatisticsEventCallbacksWithSelf } from "../../driver/Statistics";
import { type ZWaveNode, ZWaveNodeBase } from "../Node";
import { type NodeStatistics } from "../NodeStatistics";
import { type ZWaveNodeEventCallbacks } from "../_Types";

type ReplaceNodeWithThis<TThis, T extends any[]> = {
	[K in keyof T]: T[K] extends ZWaveNode ? TThis : T[K];
};

export type EventsToAbstract<TThis, T extends Record<keyof T, EventHandler>> = {
	[K in keyof T]: (
		...args: ReplaceNodeWithThis<TThis, Parameters<T[K]>>
	) => void;
};

type AbstractNodeEvents<TThis> = EventsToAbstract<
	TThis,
	& ZWaveNodeEventCallbacks
	& StatisticsEventCallbacksWithSelf<ZWaveNode, NodeStatistics>
>;

export abstract class NodeEventsMixin extends ZWaveNodeBase {
	protected abstract emitEvent<TEvent extends keyof AbstractNodeEvents<this>>(
		event: TEvent,
		...args: Parameters<AbstractNodeEvents<this>[TEvent]>
	): boolean;
}
