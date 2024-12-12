import { JsonlDB } from "@alcalzone/jsonl-db";
import {
	type Database,
	type DatabaseFactory,
	type DatabaseOptions,
} from "@zwave-js/shared/bindings";

/** An implementation of the Database bindings for Node.js based on JsonlDB */
export const db: DatabaseFactory = {
	createInstance<V>(
		filename: string,
		options?: DatabaseOptions<V>,
	): Database<V> {
		return new JsonlDB(filename, options);
	},
};
