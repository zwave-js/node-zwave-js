"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = exports.parseLogic = void 0;
const shared_1 = require("@zwave-js/shared");
const json_logic_js_1 = require("json-logic-js");
const semver = __importStar(require("semver"));
const LogicParser_1 = require("./LogicParser");
function tryOr(operation, onError) {
    return ((...args) => {
        try {
            return operation(...args);
        }
        catch {
            return onError;
        }
    });
}
(0, json_logic_js_1.add_operation)("ver >=", tryOr((a, b) => semver.gte((0, shared_1.padVersion)(a), (0, shared_1.padVersion)(b)), false));
(0, json_logic_js_1.add_operation)("ver >", tryOr((a, b) => semver.gt((0, shared_1.padVersion)(a), (0, shared_1.padVersion)(b)), false));
(0, json_logic_js_1.add_operation)("ver <=", tryOr((a, b) => semver.lte((0, shared_1.padVersion)(a), (0, shared_1.padVersion)(b)), false));
(0, json_logic_js_1.add_operation)("ver <", tryOr((a, b) => semver.lt((0, shared_1.padVersion)(a), (0, shared_1.padVersion)(b)), false));
(0, json_logic_js_1.add_operation)("ver ===", tryOr((a, b) => semver.eq((0, shared_1.padVersion)(a), (0, shared_1.padVersion)(b)), false));
function parseLogic(logic) {
    try {
        return (0, LogicParser_1.parse)(logic);
    }
    catch (e) {
        throw new Error(`Invalid logic: ${logic}\n${e.message}`);
    }
}
exports.parseLogic = parseLogic;
function evaluate(logic, context) {
    const rules = parseLogic(logic);
    return (0, json_logic_js_1.apply)(rules, context);
}
exports.evaluate = evaluate;
//# sourceMappingURL=Logic.js.map