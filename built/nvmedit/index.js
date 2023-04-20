"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageWriteSize = exports.PageStatus = exports.ObjectType = exports.FragmentType = exports.nvmToJSON = exports.nvm500ToJSON = exports.migrateNVM = exports.jsonToNVM500 = exports.jsonToNVM = exports.json700To500 = exports.json500To700 = void 0;
require("reflect-metadata");
var convert_1 = require("./convert");
Object.defineProperty(exports, "json500To700", { enumerable: true, get: function () { return convert_1.json500To700; } });
Object.defineProperty(exports, "json700To500", { enumerable: true, get: function () { return convert_1.json700To500; } });
Object.defineProperty(exports, "jsonToNVM", { enumerable: true, get: function () { return convert_1.jsonToNVM; } });
Object.defineProperty(exports, "jsonToNVM500", { enumerable: true, get: function () { return convert_1.jsonToNVM500; } });
Object.defineProperty(exports, "migrateNVM", { enumerable: true, get: function () { return convert_1.migrateNVM; } });
Object.defineProperty(exports, "nvm500ToJSON", { enumerable: true, get: function () { return convert_1.nvm500ToJSON; } });
Object.defineProperty(exports, "nvmToJSON", { enumerable: true, get: function () { return convert_1.nvmToJSON; } });
var consts_1 = require("./nvm3/consts");
Object.defineProperty(exports, "FragmentType", { enumerable: true, get: function () { return consts_1.FragmentType; } });
Object.defineProperty(exports, "ObjectType", { enumerable: true, get: function () { return consts_1.ObjectType; } });
Object.defineProperty(exports, "PageStatus", { enumerable: true, get: function () { return consts_1.PageStatus; } });
Object.defineProperty(exports, "PageWriteSize", { enumerable: true, get: function () { return consts_1.PageWriteSize; } });
//# sourceMappingURL=index.js.map