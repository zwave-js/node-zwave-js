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
const utils_1 = require("./utils");
const VisitorIsNumber = __importStar(require("./visitor-is-number"));
const VisitorIsString = __importStar(require("./visitor-is-string"));
const VisitorTypeCheck = __importStar(require("./visitor-type-check"));
const VisitorTypeName = __importStar(require("./visitor-type-name"));
const VisitorUtils = __importStar(require("./visitor-utils"));
function visitRegularObjectType(type, indexType, visitorContext) {
    const name = VisitorTypeName.visitType(type, visitorContext, {
        type: "indexed-access",
        indexType,
    });
    return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
        // TODO: check property index
        // const stringIndexType = visitorContext.checker.getIndexTypeOfType(type, ts.IndexKind.String);
        const properties = visitorContext.checker.getPropertiesOfType(type);
        const propertiesInfo = properties.map((property) => VisitorUtils.getPropertyInfo(type, property, visitorContext));
        const stringType = VisitorIsString.visitType(indexType, visitorContext);
        if (typeof stringType === "boolean") {
            if (!stringType) {
                throw new Error("A non-string type was used to index an object type.");
            }
            const functionNames = propertiesInfo.map((propertyInfo) => propertyInfo.isMethod
                ? VisitorUtils.getIgnoredTypeFunction(visitorContext)
                : VisitorTypeCheck.visitType(propertyInfo.type, visitorContext));
            return VisitorUtils.createDisjunctionFunction(functionNames, name, visitorContext);
        }
        else {
            const strings = (0, utils_1.sliceSet)(stringType);
            if (strings.some((value) => propertiesInfo.every((propertyInfo) => propertyInfo.name !== value))) {
                throw new Error("Indexed access on object type with an index that does not exist.");
            }
            const stringPropertiesInfo = strings.map((value) => propertiesInfo.find((propertyInfo) => propertyInfo.name === value));
            const functionNames = stringPropertiesInfo.map((propertyInfo) => propertyInfo.isMethod
                ? VisitorUtils.getIgnoredTypeFunction(visitorContext)
                : VisitorTypeCheck.visitType(propertyInfo.type, visitorContext));
            return VisitorUtils.createDisjunctionFunction(functionNames, name, visitorContext);
        }
    });
}
function visitTupleObjectType(type, indexType, visitorContext) {
    const name = VisitorTypeName.visitType(type, visitorContext, {
        type: "indexed-access",
        indexType,
    });
    return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
        if (type.typeArguments === undefined) {
            throw new Error("Expected tuple type to have type arguments.");
        }
        const numberType = VisitorIsNumber.visitType(indexType, visitorContext);
        if (typeof numberType === "boolean") {
            if (!numberType) {
                throw new Error("A non-number type was used to index a tuple type.");
            }
            const functionNames = type.typeArguments.map((type) => VisitorTypeCheck.visitType(type, visitorContext));
            return VisitorUtils.createDisjunctionFunction(functionNames, name, visitorContext);
        }
        else {
            const numbers = (0, utils_1.sliceSet)(numberType);
            if (numbers.some((value) => value >= type.typeArguments.length)) {
                throw new Error("Indexed access on tuple type exceeds length of tuple.");
            }
            const functionNames = numbers.map((value) => VisitorTypeCheck.visitType(type.typeArguments[value], visitorContext));
            return VisitorUtils.createDisjunctionFunction(functionNames, name, visitorContext);
        }
    });
}
function visitArrayObjectType(type, indexType, visitorContext) {
    const numberIndexType = visitorContext.checker.getIndexTypeOfType(type, typescript_1.default.IndexKind.Number);
    if (numberIndexType === undefined) {
        throw new Error("Expected array ObjectType to have a number index type.");
    }
    const numberType = VisitorIsNumber.visitType(indexType, visitorContext);
    if (numberType !== false) {
        return VisitorTypeCheck.visitType(numberIndexType, visitorContext);
    }
    else {
        throw new Error("A non-number type was used to index an array type.");
    }
}
function visitObjectType(type, indexType, visitorContext) {
    if (tsutils.isTupleType(type)) {
        // Tuple with finite length.
        return visitTupleObjectType(type, indexType, visitorContext);
    }
    else if (visitorContext.checker.getIndexTypeOfType(type, typescript_1.default.IndexKind.Number)) {
        // Index type is number -> array type.
        return visitArrayObjectType(type, indexType, visitorContext);
    }
    else {
        // Index type is string -> regular object type.
        return visitRegularObjectType(type, indexType, visitorContext);
    }
}
function visitUnionOrIntersectionType(type, indexType, visitorContext) {
    const name = VisitorTypeName.visitType(type, visitorContext, {
        type: "indexed-access",
        indexType,
    });
    return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
        const functionNames = type.types.map((type) => visitType(type, indexType, visitorContext));
        if (tsutils.isUnionType(type)) {
            // (T | U)[I] = T[I] & U[I]
            return VisitorUtils.createConjunctionFunction(functionNames, name);
        }
        else {
            // (T & U)[I] = T[I] | U[I]
            return VisitorUtils.createDisjunctionFunction(functionNames, name, visitorContext);
        }
    });
}
function visitIndexType() {
    // (keyof U)[T] is an error (actually it can be String.toString or String.valueOf but we don't support this edge case)
    throw new Error("Index types cannot be used as indexed types.");
}
function visitNonPrimitiveType() {
    // object[T] is an error
    throw new Error("Non-primitive object cannot be used as an indexed type.");
}
function visitLiteralType() {
    // 'string'[T] or 0xFF[T] is an error
    throw new Error("Literal strings/numbers cannot be used as an indexed type.");
}
function visitTypeReference(type, indexType, visitorContext) {
    const mapping = VisitorUtils.getTypeReferenceMapping(type, visitorContext);
    const previousTypeReference = visitorContext.previousTypeReference;
    visitorContext.typeMapperStack.push(mapping);
    visitorContext.previousTypeReference = type;
    const result = visitType(type.target, indexType, visitorContext);
    visitorContext.previousTypeReference = previousTypeReference;
    visitorContext.typeMapperStack.pop();
    return result;
}
function visitTypeParameter(type, indexType, visitorContext) {
    const mappedType = VisitorUtils.getResolvedTypeParameter(type, visitorContext);
    if (mappedType === undefined) {
        throw new Error("Unbound type parameter, missing type node.");
    }
    return visitType(mappedType, indexType, visitorContext);
}
function visitBigInt() {
    // bigint[T] is an error
    throw new Error("BigInt cannot be used as an indexed type.");
}
function visitBoolean() {
    // boolean[T] is an error
    throw new Error("Boolean cannot be used as an indexed type.");
}
function visitString() {
    // string[T] is an error
    throw new Error("String cannot be used as an indexed type.");
}
function visitBooleanLiteral() {
    // true[T] or false[T] is an error
    throw new Error("True/false cannot be used as an indexed type.");
}
function visitNumber() {
    // number[T] is an error
    throw new Error("Number cannot be used as an indexed type.");
}
function visitUndefined() {
    // undefined[T] is an error
    throw new Error("Undefined cannot be used as an indexed type.");
}
function visitNull() {
    // null[T] is an error
    throw new Error("Null cannot be used as an indexed type.");
}
function visitNever(visitorContext) {
    // never[T] = never
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitUnknown(visitorContext) {
    // unknown[T] = unknown
    return VisitorUtils.getUnknownFunction(visitorContext);
}
function visitAny(visitorContext) {
    // any[T] = any
    return VisitorUtils.getAnyFunction(visitorContext);
}
function visitType(type, indexType, visitorContext) {
    if ((typescript_1.default.TypeFlags.Any & type.flags) !== 0) {
        // Any
        return visitAny(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Unknown & type.flags) !== 0) {
        // Unknown
        return visitUnknown(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Never & type.flags) !== 0) {
        // Never
        return visitNever(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Null & type.flags) !== 0) {
        // Null
        return visitNull();
    }
    else if ((typescript_1.default.TypeFlags.Undefined & type.flags) !== 0) {
        // Undefined
        return visitUndefined();
    }
    else if ((typescript_1.default.TypeFlags.Number & type.flags) !== 0) {
        // Number
        return visitNumber();
    }
    else if (VisitorUtils.isBigIntType(type)) {
        // BigInt
        return visitBigInt();
    }
    else if ((typescript_1.default.TypeFlags.Boolean & type.flags) !== 0) {
        // Boolean
        return visitBoolean();
    }
    else if ((typescript_1.default.TypeFlags.String & type.flags) !== 0) {
        // String
        return visitString();
    }
    else if ((typescript_1.default.TypeFlags.BooleanLiteral & type.flags) !== 0) {
        // Boolean literal (true/false)
        return visitBooleanLiteral();
    }
    else if (tsutils.isTypeReference(type) &&
        visitorContext.previousTypeReference !== type) {
        // Type references.
        return visitTypeReference(type, indexType, visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.TypeParameter & type.flags) !== 0) {
        // Type parameter
        return visitTypeParameter(type, indexType, visitorContext);
    }
    else if (tsutils.isObjectType(type)) {
        // Object type (including interfaces, arrays, tuples)
        return visitObjectType(type, indexType, visitorContext);
    }
    else if (tsutils.isLiteralType(type)) {
        // Literal string/number types ('foo')
        return visitLiteralType();
    }
    else if (tsutils.isUnionOrIntersectionType(type)) {
        // Union or intersection type (| or &)
        return visitUnionOrIntersectionType(type, indexType, visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.NonPrimitive & type.flags) !== 0) {
        // Non-primitive such as object
        return visitNonPrimitiveType();
    }
    else if ((typescript_1.default.TypeFlags.Index & type.flags) !== 0) {
        // Index type: keyof T
        return visitIndexType();
    }
    else if (tsutils.isIndexedAccessType(type)) {
        // Indexed access type: T[U]
        // return visitIndexedAccessType(type, visitorContext);
        // TODO:
        throw new Error("Not yet implemented.");
    }
    else {
        throw new Error(`Could not generate type-check; unsupported type with flags: ${type.flags}`);
    }
}
exports.visitType = visitType;
//# sourceMappingURL=visitor-indexed-access.js.map