import type {
	CommandClasses,
	CommandClassInfo,
} from "../capabilities/CommandClasses";
import type { MulticastDestination } from "../consts";
import type { IVirtualNode, IZWaveNode } from "./IZWaveNode";

/** A basic abstraction of a Z-Wave endpoint providing access to the relevant functionality */
export interface IZWaveEndpoint {
	readonly nodeId: number;
	readonly index: number;
	readonly virtual: false;
	getCCVersion(cc: CommandClasses): number;
	addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void;
	removeCC(cc: CommandClasses): void;
	getCCs(): Iterable<[ccId: CommandClasses, info: CommandClassInfo]>;
	supportsCC(cc: CommandClasses): boolean;
	controlsCC(cc: CommandClasses): boolean;
	isCCSecure(cc: CommandClasses): boolean;
	getNodeUnsafe(): IZWaveNode | undefined;
}

/** A basic abstraction of an endpoint of a virtual node (multicast or broadcast) providing access to the relevant functionality */
export interface IVirtualEndpoint {
	readonly nodeId: number | MulticastDestination;
	readonly node: IVirtualNode;
	readonly index: number;
	readonly virtual: true;
	getCCVersion(cc: CommandClasses): number;
	supportsCC(cc: CommandClasses): boolean;
}
