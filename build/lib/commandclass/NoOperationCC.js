"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandClass_1 = require("./CommandClass");
const CommandClasses_1 = require("./CommandClasses");
let NoOperationCC = class NoOperationCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId) {
        super(driver, nodeId);
    }
};
NoOperationCC = __decorate([
    CommandClass_1.commandClass(CommandClasses_1.CommandClasses["No Operation"]),
    CommandClass_1.implementedVersion(1),
    __metadata("design:paramtypes", [Object, Number])
], NoOperationCC);
exports.NoOperationCC = NoOperationCC;
