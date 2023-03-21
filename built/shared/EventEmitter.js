"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedEventEmitter = void 0;
const events_1 = __importDefault(require("events"));
const inheritance_1 = require("./inheritance");
class TypedEventEmitter {
}
exports.TypedEventEmitter = TypedEventEmitter;
// Make TypedEventEmitter inherit from EventEmitter without actually extending
// because that causes TypeScript to complain about invalid inheritance
(0, inheritance_1.applyMixin)(TypedEventEmitter, events_1.default);
//# sourceMappingURL=EventEmitter.js.map