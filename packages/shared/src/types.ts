/** Enforces that all of the required properties (optional properties may be omitted) or none of the properties exist */
export type AllOrNone<T extends Record<string, any>> =
	| T
	| { [key in keyof T]?: undefined };

export type DeepPartial<T> = { [P in keyof T]+?: DeepPartial<T[P]> };

export type JSONObject = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/ban-types
export type Constructor<T = {}> = new (...args: any[]) => T;

// eslint-disable-next-line @typescript-eslint/ban-types
export type TypedClassDecorator<TTarget extends Object> = <
	T extends TTarget,
	TConstructor extends new (...args: any[]) => T,
>(
	apiClass: TConstructor,
) => TConstructor | void;

export type UnionToIntersection<T> = (
	T extends any ? (x: T) => any : never
) extends (x: infer R) => any
	? R
	: never;

export type OnlyMethods<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : never;
};
export type MethodsNamesOf<T> = OnlyMethods<T>[keyof T];

export type IsAny<T> = 0 extends 1 & T ? true : false;
