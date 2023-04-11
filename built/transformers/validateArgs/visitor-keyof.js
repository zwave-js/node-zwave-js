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
const VisitorTypeName = __importStar(require("./visitor-type-name"));
const VisitorUtils = __importStar(require("./visitor-utils"));
const visitor_utils_1 = require("./visitor-utils");
function visitUnionOrIntersectionType(type, visitorContext) {
    const name = VisitorTypeName.visitType(type, visitorContext, {
        type: "keyof",
    });
    return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
        const functionNames = type.types.map((type) => visitType(type, visitorContext));
        if (tsutils.isUnionType(type)) {
            // keyof (T | U) = (keyof T) & (keyof U)
            return VisitorUtils.createConjunctionFunction(functionNames, name);
        }
        else {
            // keyof (T & U) = (keyof T) | (keyof U)
            return VisitorUtils.createDisjunctionFunction(functionNames, name, visitorContext);
        }
    });
}
function visitIndexType(visitorContext) {
    // keyof keyof T = never (actually it's the methods of string, but we'll ignore those since they're not serializable)
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitNonPrimitiveType(type, visitorContext) {
    const intrinsicName = (0, visitor_utils_1.getIntrinsicName)(type);
    if (intrinsicName === "object") {
        // keyof object = never
        return VisitorUtils.getNeverFunction(visitorContext);
    }
    else {
        throw new Error(`Unsupported non-primitive with intrinsic name: ${intrinsicName}.`);
    }
}
function visitLiteralType(visitorContext) {
    // keyof 'string' = never and keyof 0xFF = never (actually they are the methods of string and number, but we'll ignore those since they're not serializable)
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitRegularObjectType(type, visitorContext) {
    const stringIndexType = visitorContext.checker.getIndexTypeOfType(type, typescript_1.default.IndexKind.String);
    if (stringIndexType) {
        // There is a string index type { [Key: string]: T }.
        // keyof { [Key: string]: U } = string
        return VisitorUtils.getStringFunction(visitorContext);
    }
    else {
        const name = VisitorTypeName.visitType(type, visitorContext, {
            type: "keyof",
        });
        return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
            // In keyof mode we check if the object is equal to one of the property names.
            // keyof { x: T } = x
            const properties = visitorContext.checker.getPropertiesOfType(type);
            const names = properties.map((property) => property.name);
            const condition = VisitorUtils.createBinaries(names.map((name) => typescript_1.default.factory.createStrictInequality(VisitorUtils.objectIdentifier, typescript_1.default.factory.createStringLiteral(name))), typescript_1.default.SyntaxKind.AmpersandAmpersandToken, typescript_1.default.factory.createTrue());
            return VisitorUtils.createAssertionFunction(condition, { type: "object-keyof", properties: names }, name, visitorContext);
        });
    }
}
function visitTupleObjectType(visitorContext) {
    // keyof [U, T] = number
    // TODO: actually they're only specific numbers (0, 1, 2...)
    return VisitorUtils.getNumberFunction(visitorContext);
}
function visitArrayObjectType(visitorContext) {
    // keyof [] = number
    return VisitorUtils.getNumberFunction(visitorContext);
}
function visitObjectType(type, visitorContext) {
    if (tsutils.isTupleType(type)) {
        // Tuple with finite length.
        return visitTupleObjectType(visitorContext);
    }
    else if (visitorContext.checker.getIndexTypeOfType(type, typescript_1.default.IndexKind.Number)) {
        // Index type is number -> array type.
        return visitArrayObjectType(visitorContext);
    }
    else {
        // Index type is string -> regular object type.
        return visitRegularObjectType(type, visitorContext);
    }
}
function visitTypeReference(type, visitorContext) {
    const mapping = VisitorUtils.getTypeReferenceMapping(type, visitorContext);
    const previousTypeReference = visitorContext.previousTypeReference;
    visitorContext.typeMapperStack.push(mapping);
    visitorContext.previousTypeReference = type;
    const result = visitType(type.target, visitorContext);
    visitorContext.previousTypeReference = previousTypeReference;
    visitorContext.typeMapperStack.pop();
    return result;
}
function visitTypeParameter(type, visitorContext) {
    const mappedType = VisitorUtils.getResolvedTypeParameter(type, visitorContext);
    if (mappedType === undefined) {
        throw new Error("Unbound type parameter, missing type node.");
    }
    return visitType(mappedType, visitorContext);
}
function visitBoolean(visitorContext) {
    // keyof boolean = never
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitString(visitorContext) {
    // keyof string = never (actually it's all the methods of string, but we'll ignore those since they're not serializable)
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitBooleanLiteral(visitorContext) {
    // keyof true = never and keyof false = never
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitBigInt(visitorContext) {
    // keyof bigint = never
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitNumber(visitorContext) {
    // keyof number = never
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitUndefined(visitorContext) {
    // keyof undefined = never
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitNull(visitorContext) {
    // keyof null = never
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitNever(visitorContext) {
    // keyof never = never
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitUnknown(visitorContext) {
    // keyof unknown = never
    return VisitorUtils.getNeverFunction(visitorContext);
}
function visitAny(visitorContext) {
    // keyof any = string (or symbol or number but we'll ignore those since they're not serializable)
    return VisitorUtils.getStringFunction(visitorContext);
}
function visitType(type, visitorContext) {
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
        return visitNull(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Undefined & type.flags) !== 0) {
        // Undefined
        return visitUndefined(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Number & type.flags) !== 0) {
        // Number
        return visitNumber(visitorContext);
    }
    else if (VisitorUtils.isBigIntType(type)) {
        // BigInt
        return visitBigInt(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Boolean & type.flags) !== 0) {
        // Boolean
        return visitBoolean(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.String & type.flags) !== 0) {
        // String
        return visitString(visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.BooleanLiteral & type.flags) !== 0) {
        // Boolean literal (true/false)
        return visitBooleanLiteral(visitorContext);
    }
    else if (tsutils.isTypeReference(type) &&
        visitorContext.previousTypeReference !== type) {
        // Type references.
        return visitTypeReference(type, visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.TypeParameter & type.flags) !== 0) {
        // Type parameter
        return visitTypeParameter(type, visitorContext);
    }
    else if (tsutils.isObjectType(type)) {
        // Object type (including interfaces, arrays, tuples)
        return visitObjectType(type, visitorContext);
    }
    else if (tsutils.isLiteralType(type)) {
        // Literal string/number types ('foo')
        return visitLiteralType(visitorContext);
    }
    else if (tsutils.isUnionOrIntersectionType(type)) {
        // Union or intersection type (| or &)
        return visitUnionOrIntersectionType(type, visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.NonPrimitive & type.flags) !== 0) {
        // Non-primitive such as object
        return visitNonPrimitiveType(type, visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.Index & type.flags) !== 0) {
        // Index type: keyof T
        return visitIndexType(visitorContext);
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
//# sourceMappingURL=visitor-keyof.js.map