/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-empty-function */
import type { Message } from "../message/Message";

export const createSendDataResolvesNever = () =>
	jest.fn().mockImplementation(
		() => new Promise<unknown>(() => {}),
	);
export const createSendDataResolvesImmediately = () =>
	jest.fn().mockResolvedValue(undefined);
export const createSendDataRejectsImmediately = () =>
	jest.fn().mockRejectedValue(new Error("nope"));

export const dummyMessageNoResponseNoCallback = ({
	serialize: () => Buffer.from([1, 2, 3]),
	expectedResponse: undefined,
	expectedCallback: undefined,
} as any) as Message;
export const dummyMessageWithResponseNoCallback = ({
	serialize: () => Buffer.from([1, 2, 3]),
	expectedResponse: 0xff,
	expectedCallback: undefined,
} as any) as Message;
// export const dummyMessageNoResponseWithCallback = ({
// 	serialize: () => Buffer.from([1, 2, 3]),
// 	expectedResponse: undefined,
// 	expectedCallback: true,
// } as any) as Message;
// export const dummyMessageWithResponseWithCallback = ({
// 	serialize: () => Buffer.from([1, 2, 3]),
// 	expectedResponse: true,
// 	expectedCallback: true,
// } as any) as Message;
