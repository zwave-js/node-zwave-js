import { type EventHandler } from "@zwave-js/shared";
import { type StatisticsEventCallbacksWithSelf } from "../../driver/Statistics";
import { type ZWaveNode } from "../Node";
import { type NodeStatistics } from "../NodeStatistics";
import { type ZWaveNodeEventCallbacks } from "../_Types";
import { NetworkRoleMixin } from "./01_NetworkRole";

// This mixin is a slightly ugly workaround to allow other mixins to
// interact with events which would normally take an instance of ZWaveNode

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

export abstract class NodeEventsMixin extends NetworkRoleMixin {
	protected abstract _emit<TEvent extends keyof AbstractNodeEvents<this>>(
		event: TEvent,
		...args: Parameters<AbstractNodeEvents<this>[TEvent]>
	): boolean;

	protected abstract _on<TEvent extends keyof AbstractNodeEvents<this>>(
		event: TEvent,
		callback: AbstractNodeEvents<this>[TEvent],
	): this;
	protected abstract _once<TEvent extends keyof AbstractNodeEvents<this>>(
		event: TEvent,
		callback: AbstractNodeEvents<this>[TEvent],
	): this;
}
