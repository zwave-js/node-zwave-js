declare module "xml2json" {
	export type ToJsonOptions = {
		// Returns a Javascript object instead of a JSON string
		object: boolean;
		// Makes the JSON reversible to XML
		reversible: boolean;
		// Makes type coercion. i.e.: numbers and booleans present in attributes and
		// element values are converted from  string to its correspondent data types.
		// Coerce can be optionally defined as an object with specific methods of
		// coercion based on attribute name or tag name, with fallback to default coercion.
		coerce: boolean;
		// Sanitizes the following characters present in element values: < > ( ) # & " '
		sanitize: boolean;
		// Removes leading and trailing whitespaces as well as line terminators in element values.
		trim: boolean;
		// XML child nodes are always treated as arrays NB: you can specify
		// a selective array of nodes for this to apply to instead of the whole document.
		arrayNotation: boolean;
		// Changes the default textNode property from $t to _t when option is set to true.
		// Alternatively a string can be specified which will override $t to what ever the string is.
		alternateTextNode: boolean;
	};

	export type ToXmlOptions = {
		// Sanitizes the following characters present in element values: < > ( ) # & " '
		sanitize: boolean;
		// Ignores all null values
		ignoreNull: boolean;
	};

	export function toJson(
		xml: string,
		options?: Partial<ToJsonOptions>,
	): string | object;
	export function toXml(
		json: string,
		options?: Partial<ToXmlOptions>,
	): string;
}
