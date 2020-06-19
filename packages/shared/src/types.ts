/** Enforces that all of the required properties (optional properties may be omitted) or none of the properties exist */
export type AllOrNone<T extends Record<string, any>> =
	| T
	| { [key in keyof T]?: undefined };

export type DeepPartial<T> = { [P in keyof T]+?: DeepPartial<T[P]> };

export type JSONObject = Record<string, any>;

export type Constructor = new (...args: any[]) => any;
