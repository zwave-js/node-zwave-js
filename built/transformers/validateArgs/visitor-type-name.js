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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitType = void 0;
const tsutils = __importStar(require("tsutils/typeguard/3.0"));
const typescript_1 = __importDefault(require("typescript"));
const VisitorIndexedAccess = __importStar(require("./visitor-indexed-access"));
const VisitorKeyof = __importStar(require("./visitor-keyof"));
const VisitorUtils = __importStar(require("./visitor-utils"));
const visitor_utils_1 = require("./visitor-utils");
function visitTupleObjectType(type, visitorContext, mode) {
    if (type.typeArguments === undefined) {
        return "st_et";
    }
    const itemNames = type.typeArguments.map((type) => visitType(type, visitorContext, mode));
    return `st_${itemNames.join("_")}_et`;
}
function visitArrayObjectType(type, visitorContext, mode) {
    const numberIndexType = visitorContext.checker.getIndexTypeOfType(type, typescript_1.default.IndexKind.Number);
    if (numberIndexType === undefined) {
        throw new Error("Expected array ObjectType to have a number index type.");
    }
    const numberIndexName = visitType(numberIndexType, visitorContext, mode);
    return `sa_${numberIndexName}_ea`;
}
function getTypeIndexById(type, { typeIdMap }) {
    const id = type.id.toString();
    let index = typeIdMap.get(id);
    if (index === undefined) {
        index = typeIdMap.size.toString();
        typeIdMap.set(id, index);
    }
    return index;
}
function visitRegularObjectType(type, visitorContext) {
    const index = getTypeIndexById(type, visitorContext);
    return `_${index}`;
}
function visitTypeReference(type, visitorContext, mode) {
    const mapping = VisitorUtils.getTypeReferenceMapping(type, visitorContext);
    const previousTypeReference = visitorContext.previousTypeReference;
    visitorContext.typeMapperStack.push(mapping);
    visitorContext.previousTypeReference = type;
    const result = visitType(type.target, visitorContext, mode);
    visitorContext.previousTypeReference = previousTypeReference;
    visitorContext.typeMapperStack.pop();
    return result;
}
function visitTypeParameter(type, visitorContext, mode) {
    const mappedType = VisitorUtils.getResolvedTypeParameter(type, visitorContext);
    if (mappedType === undefined) {
        throw new Error("Unbound type parameter, missing type node.");
    }
    return visitType(mappedType, visitorContext, mode);
}
function visitObjectType(type, visitorContext, mode) {
    if (tsutils.isTupleType(type)) {
        return visitTupleObjectType(type, visitorContext, mode);
    }
    else if ((0, visitor_utils_1.checkIsNodeBuffer)(type)) {
        return "_buffer";
    }
    else if (visitorContext.checker.getIndexTypeOfType(type, typescript_1.default.IndexKind.Number)) {
        return visitArrayObjectType(type, visitorContext, mode);
    }
    else if ((0, visitor_utils_1.checkIsDateClass)(type)) {
        return "_date";
    }
    else {
        return visitRegularObjectType(type, visitorContext);
    }
}
function visitUnionOrIntersectionType(type, visitorContext, mode) {
    const names = type.types.map((type) => visitType(type, visitorContext, mode));
    if (tsutils.isIntersectionType(type)) {
        return `si_${names.join("_")}_ei`;
    }
    else {
        return `su_${names.join("_")}_eu`;
    }
}
function visitIndexType(type, visitorContext) {
    const indexedType = type.type;
    if (indexedType === undefined) {
        throw new Error("Could not get indexed type of index type.");
    }
    return VisitorKeyof.visitType(indexedType, visitorContext);
}
function visitIndexedAccessType(type, visitorContext) {
    return VisitorIndexedAccess.visitType(type.objectType, type.indexType, visitorContext);
}
function visitType(type, visitorContext, mode) {
    let name;
    const index = getTypeIndexById(type, visitorContext);
    if ((typescript_1.default.TypeFlags.Any & type.flags) !== 0) {
        name = VisitorUtils.getAnyFunction(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Unknown & type.flags) !== 0) {
        name = VisitorUtils.getUnknownFunction(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Never & type.flags) !== 0) {
        name = VisitorUtils.getNeverFunction(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Null & type.flags) !== 0) {
        name = VisitorUtils.getNullFunction(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Undefined & type.flags) !== 0) {
        name = VisitorUtils.getUndefinedFunction(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Number & type.flags) !== 0) {
        name = VisitorUtils.getNumberFunction(visitorContext);
    }
    else if (VisitorUtils.isBigIntType(type)) {
        name = VisitorUtils.getBigIntFunction(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Boolean & type.flags) !== 0) {
        name = VisitorUtils.getBooleanFunction(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.String & type.flags) !== 0) {
        name = VisitorUtils.getStringFunction(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.BooleanLiteral & type.flags) !== 0) {
        name = `_${index}`;
    }
    else if (tsutils.isTypeReference(type) &&
        visitorContext.previousTypeReference !== type) {
        name = visitTypeReference(type, visitorContext, mode);
    }
    else if ((typescript_1.default.TypeFlags.TypeParameter & type.flags) !== 0) {
        name = visitTypeParameter(type, visitorContext, mode);
    }
    else if (tsutils.isObjectType(type)) {
        name = visitObjectType(type, visitorContext, mode);
    }
    else if (tsutils.isLiteralType(type)) {
        name = `_${index}`;
    }
    else if (tsutils.isUnionOrIntersectionType(type)) {
        name = visitUnionOrIntersectionType(type, visitorContext, mode);
    }
    else if ((typescript_1.default.TypeFlags.NonPrimitive & type.flags) !== 0) {
        name = `_${index}`;
    }
    else if ((typescript_1.default.TypeFlags.Index & type.flags) !== 0) {
        name = visitIndexType(type, visitorContext);
    }
    else if (tsutils.isIndexedAccessType(type)) {
        name = visitIndexedAccessType(type, visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.TemplateLiteral & type.flags) !== 0) {
        name = `_${index}`;
    }
    else {
        throw new Error(`Could not generate type-check; unsupported type with flags: ${type.flags}`);
    }
    if (mode.type === "keyof") {
        name += "_keyof";
    }
    if (mode.type === "indexed-access") {
        const indexTypeName = visitType(mode.indexType, visitorContext, {
            type: "type-check",
        });
        name += `_ia__${indexTypeName}`;
    }
    if (tsutils.isTypeReference(type) && type.typeArguments !== undefined) {
        for (const typeArgument of type.typeArguments) {
            const resolvedType = VisitorUtils.getResolvedTypeParameter(typeArgument, visitorContext) || typeArgument;
            const resolvedTypeIndex = getTypeIndexById(resolvedType, visitorContext);
            name += `_${resolvedTypeIndex}`;
        }
    }
    return name;
}
exports.visitType = visitType;
//# sourceMappingURL=visitor-type-name.js.map