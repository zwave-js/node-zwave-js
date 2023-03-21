"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HailCC = void 0;
const safe_1 = require("@zwave-js/core/safe");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const _Types_1 = require("../lib/_Types");
// Decorators are applied in the reverse source order, so for @CCCommand to work,
// it must come before @commandClass
let HailCC = class HailCC extends CommandClass_1.CommandClass {
};
HailCC = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HailCommand.Hail),
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Hail),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], HailCC);
exports.HailCC = HailCC;
//# sourceMappingURL=HailCC.js.map