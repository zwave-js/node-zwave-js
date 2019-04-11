"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandClass_1 = require("./CommandClass");
function isCommandClassContainer(msg) {
    return msg.command instanceof CommandClass_1.CommandClass;
}
exports.isCommandClassContainer = isCommandClassContainer;
