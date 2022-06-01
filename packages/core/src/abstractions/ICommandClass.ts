import type { CommandClasses } from "../capabilities/CommandClasses";
import type { MulticastDestination } from "../consts";

export interface ICommandClass {
	ccId: CommandClasses;
	ccCommand?: number;

	serialize(): Buffer;
	nodeId: number | MulticastDestination;
	expectsCCResponse(): boolean;
	isExpectedCCResponse(received: ICommandClass): boolean;
}

export type SinglecastCC<T extends ICommandClass = ICommandClass> = T & {
	nodeId: number;
};

export type MulticastCC<T extends ICommandClass = ICommandClass> = T & {
	nodeId: MulticastDestination;
};
