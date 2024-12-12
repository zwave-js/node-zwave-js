import { type ValueDB } from "../values/ValueDB.js";

/** Host application abstractions that provide support for reading and writing values to a database */
export interface GetValueDB {
	/** Returns the value DB which belongs to the node with the given ID, or throws if the Value DB cannot be accessed */
	getValueDB(nodeId: number): ValueDB;

	/** Returns the value DB which belongs to the node with the given ID, or `undefined` if the Value DB cannot be accessed */
	tryGetValueDB(nodeId: number): ValueDB | undefined;
}
