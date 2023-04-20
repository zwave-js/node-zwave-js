"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateArgs = void 0;
/** Generates code at build time which validates all arguments of this method */
function validateArgs(options) {
    return (target, property) => {
        // this is a no-op that gets replaced during the build process using the transformer below
        if (process.env.NODE_ENV === "test")
            return;
        // Throw an error at runtime when this didn't get transformed
        throw new Error("validateArgs is a compile-time decorator and must be compiled with a transformer");
    };
}
exports.validateArgs = validateArgs;
const transformer_1 = __importDefault(require("./validateArgs/transformer"));
exports.default = transformer_1.default;
//# sourceMappingURL=index.js.map