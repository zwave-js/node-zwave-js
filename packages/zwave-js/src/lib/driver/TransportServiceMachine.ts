import {
	assign,
	AssignAction,
	Interpreter,
	Machine,
	StateMachine,
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
	receivedSegments: boolean[];
}

export type TransportServiceRXEvent = { type: "segment"; index: number };

export type TransportServiceRXMachine = StateMachine<
	TransportServiceRXContext,
	TransportServiceRXStateSchema,
	TransportServiceRXEvent
>;
export type TransportServiceRXInterpreter = Interpreter<
	TransportServiceRXContext,
	TransportServiceRXStateSchema,
	TransportServiceRXEvent
>;

export type TransportServiceRXMachineParams = {
	numSegments: number;
	missingSegmentTimeout: number;
};

const receiveSegment: AssignAction<TransportServiceRXContext, any> = assign(
	(ctx, evt) => {
		ctx.receivedSegments[evt.index] = true;
		return ctx;
	},
);

export interface TransportServiceRXServiceImplementations {
	requestMissingSegment(index: number): Promise<void>;
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
				receivedSegments: [
					// When the machine is started, we've already received the first segment
					true,
					// The rest of the segments are still missing
					...Array.from<boolean>({
						length: params.numSegments - 1,
					}).fill(false),
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
						ctx.receivedSegments.indexOf(false),
					);
				},
				sendSegmentsComplete: () => {
					return implementations.sendSegmentsComplete();
				},
			},
			guards: {
				isComplete: (ctx) => ctx.receivedSegments.every(Boolean),
				hasHole: (ctx) =>
					ctx.receivedSegments.lastIndexOf(true) >
					ctx.receivedSegments.indexOf(false),
			},
			delays: {
				missingSegment: params.missingSegmentTimeout,
			},
		},
	);
}
