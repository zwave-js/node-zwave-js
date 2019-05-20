// This module is the main entry point. Requiring reflect-metadata here avoids forgetting it
require("reflect-metadata");

export { Driver } from "./lib/driver/Driver";
export { ZWaveNode } from "./lib/node/Node";

// TODO: driver.on("...") is not strictly typed
