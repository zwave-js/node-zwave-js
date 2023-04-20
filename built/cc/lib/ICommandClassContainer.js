"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCommandClassContainer = void 0;
const CommandClass_1 = require("./CommandClass");
/**
 * Tests if the given message contains a CC
 */
function isCommandClassContainer(msg) {
    return msg?.command instanceof CommandClass_1.CommandClass;
}
exports.isCommandClassContainer = isCommandClassContainer;
//# sourceMappingURL=ICommandClassContainer.js.map