// FIXME: This should eventually live in @zwave-js/host

import { type Serial } from "@zwave-js/serial";
import {
	type DatabaseFactory,
	type FileSystem,
	type Platform,
} from "@zwave-js/shared/bindings";

/** Abstractions for a host system Z-Wave JS is running on */
export interface Host {
	fs: FileSystem;
	platform: Platform;
	serial: Serial;
	db: DatabaseFactory;
}
