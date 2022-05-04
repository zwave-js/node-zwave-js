export interface ExpectedFunction {
	type: "function";
}

export interface ExpectedString {
	type: "string";
}

export interface ExpectedNumber {
	type: "number";
}

export interface ExpectedBigInt {
	type: "big-int";
}

export interface ExpectedBoolean {
	type: "boolean";
}

export interface ExpectedStringLiteral {
	type: "string-literal";
	value: string;
}

export interface ExpectedNumberLiteral {
	type: "number-literal";
	value: number;
}

export interface ExpectedBooleanLiteral {
	type: "boolean-literal";
	value: boolean;
}

export interface ExpectedObject {
	type: "object";
}

export interface ExpectedDate {
	type: "date";
}

export interface ExpectedBuffer {
	type: "buffer";
}

export interface ExpectedClass {
	type: "class";
	name: string;
}

export interface ExpectedNonPrimitive {
	type: "non-primitive";
}

export interface ExpectedEnum {
	type: "enum";
	name: string;
}

export interface MissingObjectProperty {
	type: "missing-property";
	property: string;
}

export interface SuperfluousObjectProperty {
	type: "superfluous-property";
}

export interface ExpectedObjectKeyof {
	type: "object-keyof";
	properties: string[];
}

export interface ExpectedArray {
	type: "array";
}

export interface NeverType {
	type: "never";
}

export interface ExpectedTuple {
	type: "tuple";
	minLength: number;
	maxLength: number;
}

export interface NoValidUnionAlternatives {
	type: "union";
}

export interface ExpectedUndefined {
	type: "undefined";
}

export interface ExpectedNull {
	type: "null";
}

export type TemplateLiteralPair = [
	string,
	"string" | "number" | "bigint" | "any" | "undefined" | "null" | undefined,
];

export interface ExpectedTemplateLiteral {
	type: "template-literal";
	value: TemplateLiteralPair[];
}

export type Reason =
	| ExpectedFunction
	| ExpectedString
	| ExpectedNumber
	| ExpectedBigInt
	| ExpectedBoolean
	| ExpectedObject
	| ExpectedDate
	| ExpectedBuffer
	| ExpectedClass
	| ExpectedNonPrimitive
	| MissingObjectProperty
	| SuperfluousObjectProperty
	| ExpectedObjectKeyof
	| ExpectedArray
	| ExpectedTuple
	| NeverType
	| NoValidUnionAlternatives
	| ExpectedUndefined
	| ExpectedNull
	| ExpectedStringLiteral
	| ExpectedNumberLiteral
	| ExpectedBooleanLiteral
	| ExpectedTemplateLiteral
	| ExpectedEnum;
