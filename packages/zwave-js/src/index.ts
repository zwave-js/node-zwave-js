// organize-imports-ignore

/* @forbiddenImports sinon */

// This module is the main entry point. Requiring reflect-metadata here avoids forgetting it
import "reflect-metadata";

// By installing source map support, we get the original source
// locations in error messages
import { install as installSourceMapSupport } from "source-map-support";
installSourceMapSupport();

// Export some frequently-used things and types - this also loads all CC files including metadata
export * from "@zwave-js/cc";
export * from "./Controller";
export * from "./Driver";
export * from "./Error";
export * from "./Node";
export * from "./Utils";
export * from "./Values";
export * from "./Zniffer";
