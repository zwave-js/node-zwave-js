export type Predicate<T> = (value: T) => boolean;
export type KeyValuePair<T> = [string, T];

/**
 * Stellt einen Polyfill für Object.entries bereit
 * @param obj Das Objekt, dessen Eigenschaften als Key-Value-Pair iteriert werden sollen
 */
export function entries<T>(obj: Record<string, T>): KeyValuePair<T>[];
export function entries(obj: any): KeyValuePair<any>[] {
	return Object.keys(obj)
		.map(key => [key, obj[key]] as KeyValuePair<any>)
		;

	}

/**
 * Stellt einen Polyfill für Object.values bereit
 * @param obj Das Objekt, dessen Eigenschaftswerte iteriert werden sollen
 */
export function values<T>(obj: Record<string, T>): T[];
export function values(obj: any): any[] {
	return Object.keys(obj)
		.map(key => obj[key])
		;
}

/**
 * Gibt ein Subset eines Objekts zurück, dessen Eigenschaften einem Filter entsprechen
 * @param obj Das Objekt, dessen Eigenschaften gefiltert werden sollen
 * @param predicate Die Filter-Funktion, die auf Eigenschaften angewendet wird
 */
export function filter<T>(obj: Record<string, T>, predicate: Predicate<T>): Record<string, T>;
export function filter(obj: any, predicate: Predicate<any>): Record<string, any> {
	const ret: Record<string, any> = {};
	for (const [key, val] of entries(obj)) {
		if (predicate(val)) ret[key] = val;
	}
	return ret;
}

/**
 * Kombinierte mehrere Key-Value-Paare zu einem Objekt
 * @param properties Die Key-Value-Paare, die zu einem Objekt kombiniert werden sollen
 */
export function composeObject<T>(properties: KeyValuePair<T>[]): Record<string, T>;
export function composeObject(properties: KeyValuePair<any>[]): Record<string, any> {
	return properties.reduce((acc: Record<string, any>, [key, value]) => {
		acc[key] = value;
		return acc;
	}, {});
}
