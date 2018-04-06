"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandClass_1 = require("./CommandClass");
let NoOperationCC = class NoOperationCC extends CommandClass_1.CommandClass {
    serialize() {
        // define this.payload
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        // parse this.payload
    }
};
NoOperationCC.maxSupportedVersion = 1;
NoOperationCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["No Operation"])
], NoOperationCC);
exports.NoOperationCC = NoOperationCC;
