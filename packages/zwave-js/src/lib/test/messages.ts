import type { Message } from "@zwave-js/serial";
import { MessageType } from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared";

const defaultImplementations = {
	serialize: () => Promise.resolve(Bytes.from([1, 2, 3])),
	tryGetNode: () => undefined,
	getNodeId: () => undefined,
	toLogEntry: () => ({ tags: [] }),
	needsCallbackId: () => true,
	getResponseTimeout: () => undefined,
	getCallbackTimeout: () => undefined,
	markAsSent: () => void 0,
	markAsCompleted: () => void 0,
	expectsAck: () => true,
};

export const dummyResponseOK = {
	type: MessageType.Response,
	expectedResponse: undefined,
	expectedCallback: undefined,
	hasCallbackId: () => false,
	expectsResponse: () => false,
	expectsCallback: () => false,
	isOK: () => true,
	...defaultImplementations,
} as any as Message;
export const dummyCallbackOK = {
	type: MessageType.Request,
	expectedResponse: undefined,
	expectedCallback: undefined,
	hasCallbackId: () => false,
	expectsResponse: () => false,
	expectsCallback: () => false,
	isOK: () => true,
	...defaultImplementations,
} as any as Message;
export const dummyCallbackPartial = {
	...dummyCallbackOK,
	isFinal: () => false,
} as any as Message;
export const dummyResponseNOK = {
	type: MessageType.Response,
	expectedResponse: undefined,
	expectedCallback: undefined,
	hasCallbackId: () => false,
	expectsResponse: () => false,
	expectsCallback: () => false,
	isOK: () => false,
	...defaultImplementations,
} as any as Message;
export const dummyCallbackNOK = {
	type: MessageType.Request,
	expectedResponse: undefined,
	expectedCallback: undefined,
	hasCallbackId: () => false,
	expectsResponse: () => false,
	expectsCallback: () => false,
	isOK: () => false,
	...defaultImplementations,
} as any as Message;
export const dummyMessageUnrelated = {
	expectedResponse: undefined,
	expectedCallback: undefined,
	hasCallbackId: () => false,
	expectsResponse: () => false,
	expectsCallback: () => false,
	...defaultImplementations,
} as any as Message;

export const dummyMessageNoResponseNoCallback = {
	expectedResponse: undefined,
	expectedCallback: undefined,
	hasCallbackId: () => false,
	expectsResponse: () => false,
	expectsCallback: () => false,
	...defaultImplementations,
} as any as Message;
export const dummyMessageWithResponseNoCallback = {
	expectedResponse: 0xff,
	expectedCallback: undefined,
	hasCallbackId: () => false,
	expectsResponse: () => true,
	expectsCallback: () => false,
	isExpectedResponse: (msg: any) =>
		msg === dummyResponseOK || msg === dummyResponseNOK,
	...defaultImplementations,
} as any as Message;
export const dummyMessageNoResponseWithCallback = {
	expectedResponse: undefined,
	expectedCallback: true,
	hasCallbackId: () => true,
	callbackId: 1,
	expectsResponse: () => false,
	expectsCallback: () => true,
	isExpectedCallback: (msg: any) =>
		msg === dummyCallbackOK || msg === dummyCallbackNOK,
	...defaultImplementations,
} as any as Message;
export const dummyMessageWithResponseWithCallback = {
	expectedResponse: true,
	expectedCallback: true,
	expectsResponse: () => true,
	expectsCallback: () => true,
	isExpectedResponse: (msg: any) =>
		msg === dummyResponseOK || msg === dummyResponseNOK,
	isExpectedCallback: (msg: any) =>
		msg === dummyCallbackOK || msg === dummyCallbackNOK,
	...defaultImplementations,
} as any as Message;
