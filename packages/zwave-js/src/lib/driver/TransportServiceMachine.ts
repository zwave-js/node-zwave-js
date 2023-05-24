import {
	Machine,
	assign,
	type AssignAction,
	type Interpreter,
	type StateMachine,
} from "xstate";

/*
	This state machine handles the receipt of Transport Service encapsulated commands from a node
*/

/* eslint-disable @typescript-eslint/ban-types */
export interface TransportServiceRXStateSchema {
	states: {
		waitingForSegment: {};
		segmentTimeout: {};
		waitingForRequestedSegment: {};
		segmentsComplete: {};
		success: {};
		failure: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

export interface TransportServiceRXContext {
	receivedBytes: boolean[];
}

export type TransportServiceRXEvent = {
	type: "segment";
	offset: number;
	length: number;
};

export type TransportServiceRXMachine = StateMachine<
	TransportServiceRXContext,
	TransportServiceRXStateSchema,
	TransportServiceRXEvent,
	any,
	any,
	any,
	any
>;
export type TransportServiceRXInterpreter = Interpreter<
	TransportServiceRXContext,
	TransportServiceRXStateSchema,
	TransportServiceRXEvent
>;

export type TransportServiceRXMachineParams = {
	datagramSize: number;
	firstSegmentSize: number;
	missingSegmentTimeout: number;
};

const receiveSegment: AssignAction<TransportServiceRXContext, any> = assign(
	(ctx, evt: TransportServiceRXEvent) => {
		for (let i = evt.offset; i < evt.offset + evt.length; i++) {
			ctx.receivedBytes[i] = true;
		}
		return ctx;
	},
);

export interface TransportServiceRXServiceImplementations {
	requestMissingSegment(offset: number): Promise<void>;
	sendSegmentsComplete(): Promise<void>;
}

export function createTransportServiceRXMachine(
	implementations: TransportServiceRXServiceImplementations,
	params: TransportServiceRXMachineParams,
): TransportServiceRXMachine {
	return Machine<
		TransportServiceRXContext,
		TransportServiceRXStateSchema,
		TransportServiceRXEvent
	>(
		{
			id: "TransportServiceRX",
			initial: "waitingForSegment",
			context: {
				receivedBytes: [
					// When the machine is started, we've already received the first segment
					...(new Array(params.firstSegmentSize).fill(
						true,
					) as boolean[]),
					// The rest of the segments are still missing
					...(new Array(
						params.datagramSize - params.firstSegmentSize,
					).fill(false) as boolean[]),
				],
			},
			states: {
				waitingForSegment: {
					always: [
						{
							cond: "isComplete",
							target: "segmentsComplete",
						},
						{
							cond: "hasHole",
							target: "segmentTimeout",
						},
					],
					after: {
						missingSegment: "segmentTimeout",
					},
					on: {
						segment: {
							actions: receiveSegment,
							target: "waitingForSegment",
							internal: false,
						},
					},
				},
				segmentTimeout: {
					invoke: {
						id: "requestMissing",
						src: "requestMissingSegment",
						onDone: {
							target: "waitingForRequestedSegment",
						},
						onError: {
							target: "failure",
						},
					},
				},
				waitingForRequestedSegment: {
					after: {
						missingSegment: "failure",
					},
					on: {
						segment: {
							actions: receiveSegment,
							target: "waitingForSegment",
							internal: false,
						},
					},
				},
				segmentsComplete: {
					invoke: {
						id: "segmentsComplete",
						src: "sendSegmentsComplete",
						onDone: {
							target: "success",
						},
						onError: {
							// If sending the command fails, the node will send us the segment again
							target: "success",
						},
					},
				},
				success: {
					type: "final",
					on: {
						segment: "segmentsComplete",
					},
				},
				failure: {
					type: "final",
				},
			},
		},
		{
			services: {
				requestMissingSegment: (ctx) => {
					return implementations.requestMissingSegment(
						ctx.receivedBytes.indexOf(false),
					);
				},
				sendSegmentsComplete: () => {
					return implementations.sendSegmentsComplete();
				},
			},
			guards: {
				isComplete: (ctx) => {
					return ctx.receivedBytes.every(Boolean);
				},
				hasHole: (ctx) =>
					ctx.receivedBytes.lastIndexOf(true) >
					ctx.receivedBytes.indexOf(false),
			},
			delays: {
				missingSegment: params.missingSegmentTimeout,
			},
		},
	);
}
