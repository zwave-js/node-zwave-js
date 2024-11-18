import path from "node:path";
import { Project, type SourceFile, type Type, ts as tsm } from "ts-morph";
import { type PluginConfig, type ProgramTransformerExtras } from "ts-patch";
import {
	type CompilerHost,
	type CompilerOptions,
	type Program,
	type SourceFile as TSSourceFile,
} from "typescript";
import type ts from "typescript";
import { type ValidateArgsOptions } from "..";
// import "ts-expose-internals";

/* ****************************************************************************************************************** */
// region Helpers
/* ****************************************************************************************************************** */

/**
 * Patches existing Compiler Host (or creates new one) to allow feeding updated file content from cache
 */
function getPatchedHost(
	maybeHost: CompilerHost | undefined,
	tsInstance: typeof ts,
	compilerOptions: CompilerOptions,
): CompilerHost & { fileCache: Map<string, TSSourceFile> } {
	const fileCache = new Map();
	const compilerHost = maybeHost
		?? tsInstance.createCompilerHost(compilerOptions, true);
	const originalGetSourceFile = compilerHost.getSourceFile.bind(compilerHost);
	const originalFileExists = compilerHost.fileExists.bind(compilerHost);

	return Object.assign(compilerHost, {
		getSourceFile(
			fileName: string,
			languageVersion: ts.ScriptTarget,
			...rest: any[]
		) {
			fileName = tsInstance.server.toNormalizedPath(fileName);
			if (fileCache.has(fileName)) return fileCache.get(fileName);

			const sourceFile = originalGetSourceFile(
				fileName,
				languageVersion,
				...rest,
			);
			fileCache.set(fileName, sourceFile);

			return sourceFile;
		},
		fileExists(fileName: string) {
			if (fileCache.has(fileName)) return true;
			return originalFileExists(fileName);
		},
		// TODO: Possibly patch fileExists and writeFile
		fileCache,
	});
}

/* ****************************************************************************************************************** */
// region Program Transformer
/* ****************************************************************************************************************** */

export default function transformProgram(
	program: Program,
	host: CompilerHost | undefined,
	config: PluginConfig,
	{ ts: tsInstance }: ProgramTransformerExtras,
): Program {
	const compilerOptions = program.getCompilerOptions();
	const compilerHost = getPatchedHost(host, tsInstance, compilerOptions);
	const rootFileNames = program.getRootFileNames().map(
		tsInstance.server.toNormalizedPath,
	);

	// Create a "shadow" program for ts-morph
	const project = new Project({ compilerOptions });

	// Remember which files were actually modified
	// const modifiedFiles = new Set<string>();

	let filesToTransform = program.getSourceFiles().filter((sourceFile) =>
		rootFileNames.includes(
			tsInstance.server.toNormalizedPath(sourceFile.fileName),
		)
	);
	// Quick check: Only transform files importing "@zwave-js/transformers"
	// The cleaner way would be to use the AST to check for imports
	filesToTransform = filesToTransform.filter((sourceFile) => {
		return sourceFile.getText().includes(`from "@zwave-js/transformers"`);
	});

	// /* Transform AST */
	// const transformedSource = tsInstance.transform(
	// 	// source files
	// 	filesToTransform,
	// 	// transformers
	// 	[
	// 		transformAst(tsInstance, modifiedFiles),
	// 	],
	// 	compilerOptions,
	// ).transformed;

	/* Render modified files and create new SourceFiles for them to use in host's cache */
	// const printer = tsInstance.createPrinter();
	for (const file of filesToTransform) {
		// if (!modifiedFiles.has(file.fileName)) continue;

		// const { fileName, languageVersion } = file;
		// const updatedSourceFileText = printer.printFile(file);
		// const updatedSourceFile = tsInstance.createSourceFile(
		// 	fileName,
		// 	updatedSourceFileText,
		// 	languageVersion,
		// );
		// compilerHost.fileCache.set(fileName, updatedSourceFile);

		const extension = file.fileName.match(/\.[mc]?[jt]s$/)?.[0];
		const fileNameOnly = path.basename(file.fileName, extension);
		const newFileName = path.join(
			path.dirname(file.fileName),
			`${fileNameOnly}._validateArgs${extension || ".ts"}`,
		);

		const mfile = project.createSourceFile(
			file.fileName,
			file.getFullText(),
			{ overwrite: true },
		);

		// Find validateArgs decorators
		const validateArgsDecorators = mfile.getDescendantsOfKind(
			tsm.SyntaxKind.Decorator,
		)
			.filter((d) =>
				d.getFirstDescendantByKind(tsm.SyntaxKind.Identifier)?.getText()
					=== "validateArgs"
			);
		const withMethodAndClassName = validateArgsDecorators.map((d) => {
			const method = d.getParentIfKind(tsm.SyntaxKind.MethodDeclaration);
			if (!method) return;

			const methodName = method?.getName();
			if (!methodName) return;

			const parameters = method
				.getParameters()
				.map((p) => ({
					name: p.getName(),
					type: p.getType(),
					typeName: p.getTypeNode()?.getText(),
				}))
				.filter((p) => p.name !== "this");

			const className = method?.getParentIfKind(
				tsm.SyntaxKind.ClassDeclaration,
			)?.getName();
			if (!className) return;

			const optionsObject = d.getCallExpression()?.getArguments()[0]
				?.asKind(tsm.SyntaxKind.ObjectLiteralExpression);
			const options: ValidateArgsOptions = {};
			if (
				optionsObject?.getProperty("strictEnums")?.asKind(
					tsm.SyntaxKind.PropertyAssignment,
				)?.getInitializer()?.getText() === "true"
			) {
				options.strictEnums = true;
			}
			return { decorator: d, options, parameters, methodName, className };
		})
			.filter((x) => x != undefined);

		let newSourceText = `import * as v from "@zwave-js/core/validation";`;

		// import specifier -> [exported name, renamed to?]
		const additionalImports = new Map<string, Set<[string, string?]>>();

		for (
			const { methodName, className, parameters, options }
				of withMethodAndClassName
		) {
			const paramSpreadWithUnknown = parameters.map((p) =>
				`${p.name}: unknown`
			).join(", ");
			const paramSpread = parameters.map((p) => p.name).join(", ");

			const context: TransformContext = {
				sourceFile: mfile,
				options,
				additionalImports,
			};

			newSourceText += `

export function validateArgs_${className}_${methodName}(options: any = {}) {
	return <T extends Function>(value: T, { kind }: ClassMethodDecoratorContext): T | void => {
		if (kind === "method") {
			return function ${methodName}(this: any, ${paramSpreadWithUnknown}) {
				v.assert(${
				parameters.map((p) => `
					${getValidationFunction(context, p)}(${p.name}),`)
					.join(
						"\n",
					)
			}
				);
				return value.call(this, ${paramSpread});
			} as unknown as T;
		}
	};
}`;
		}

		for (const [specifier, imports] of additionalImports) {
			const namedImports = [...imports].map(([imp, rename]) => {
				if (rename) {
					return `${imp} as ${rename}`;
				}
				return imp;
			});
			newSourceText =
				`import { ${namedImports.join(", ")} } from "${specifier}";`
				+ "\n"
				+ newSourceText;
		}

		compilerHost.fileCache.set(
			newFileName,
			tsInstance.createSourceFile(
				newFileName,
				newSourceText,
				{
					languageVersion: file.languageVersion,
					impliedNodeFormat: file.impliedNodeFormat,
				},
			),
		);
		rootFileNames.push(tsInstance.server.toNormalizedPath(newFileName));
	}

	/* Re-create Program instance */
	const ret = tsInstance.createProgram(
		rootFileNames,
		compilerOptions,
		compilerHost,
		// TODO: check if we should reuse the old program or not. It probably speeds things up
		// program,
	);

	return ret;
}

interface ParameterInfo {
	name: string;
	type: Type<tsm.Type>;
	typeName: string | undefined;
}

interface TransformContext {
	sourceFile: SourceFile;
	options: ValidateArgsOptions;
	additionalImports: Map<string, Set<[string, string?]>>;
	typeStack?: WeakSet<Type<tsm.Type>>;
}

function getValidationFunction(
	context: TransformContext,
	param: ParameterInfo,
	kind: "parameter" | "item" | "object" | "property" = "parameter",
): string {
	// Detect and avoid recursive references for now.
	// TODO: Solve this by generating a new validation function that calls itself
	const typeStack = context.typeStack ?? new WeakSet();
	const possiblyRecursive = param.type.isUnionOrIntersection()
		|| param.type.isClassOrInterface();
	if (possiblyRecursive && typeStack.has(param.type)) {
		throw new Error(
			`Error while transforming ${context.sourceFile.getFilePath()}
Type ${param.typeName} recursively references itself`,
		);
	}
	typeStack.add(param.type);

	if (param.type.isAny() || param.type.isUnknown()) {
		// Technically there's no need to type the parameter, but this
		// serves as documentation which type is being checked
		return `((_: ${param.typeName}) => ({ success: true }))`;
	}

	const ctx = `{ kind: "${kind}", name: "${param.name}" }`;
	if (
		param.type.isNumberLiteral()
		|| param.type.isStringLiteral()
		|| param.type.isBooleanLiteral()
	) {
		const literal = param.type.getLiteralValue() as string | number;
		if (typeof literal === "string") {
			return `v.literal(${ctx}, ${JSON.stringify(literal)})`;
		} else if (typeof literal === "number") {
			return `v.literal(${ctx}, ${literal})`;
		}
	}
	if (param.type.isNumber()) {
		return `v.primitive(${ctx}, "number")`;
	}
	if (param.type.isString()) {
		return `v.primitive(${ctx}, "string")`;
	}
	if (param.type.isBoolean()) {
		return `v.primitive(${ctx}, "boolean")`;
	}
	if (param.type.isUndefined()) {
		return `v.undefined(${ctx})`;
	}
	if (param.type.isNull()) {
		return `v.null(${ctx})`;
	}
	if (param.type.isEnum()) {
		// Enums are unions of their members. If strictEnums is false, we just check if the argument is a number instead
		if (context.options.strictEnums) {
			const values = param.type.getUnionTypes().map((t) =>
				t.getLiteralValue() as number
			);
			return `v.enum(${ctx}, "${param.typeName}", [${
				values.join(", ")
			}])`;
		} else {
			return `v.enum(${ctx}, "${param.typeName}")`;
		}
	}
	if (param.type.isUnion()) {
		const types = param.type.getUnionTypes();
		// boolean is actually union of true and false, but we want to treat it as a primitive
		const typeIsBoolean = types.some((t) =>
			t.isBooleanLiteral() && t.getText() === "true"
		)
			&& types.some((t) =>
				t.isBooleanLiteral() && t.getText() === "false"
			);
		const typeIsOptional = types.some((t) => t.isUndefined());

		const actualUnionTypes = types.filter((t) => {
			if (typeIsOptional && t.isUndefined()) return false;
			if (typeIsBoolean && t.isBooleanLiteral()) return false;
			return true;
		});

		const recurse = actualUnionTypes.map((t) =>
			getValidationFunction(
				context,
				{
					name: param.name,
					type: t,
					typeName: t.getText(),
				},
				kind,
			)
		);
		if (typeIsBoolean) {
			recurse.push(`v.primitive(${ctx}, "boolean")`);
		}

		let ret = recurse.length > 1
			? `v.oneOf(${ctx}, ${recurse.join(", ")})`
			: recurse[0];

		if (typeIsOptional) {
			ret = `v.optional(${ctx}, ${ret})`;
		}

		return ret;
	}

	if (param.type.isIntersection()) {
		const types = param.type.getIntersectionTypes();

		const recurse = types.map((t) =>
			getValidationFunction(
				context,
				{
					name: param.name,
					type: t,
					typeName: t.getText(),
				},
				kind,
			)
		);

		return `v.allOf(${ctx}, ${recurse.join(", ")})`;
	}

	if (param.type.isArray()) {
		const elementType = param.type.getArrayElementType();
		if (elementType) {
			const elementTypeName = elementType.getText();
			const itemValidation = getValidationFunction(
				context,
				{
					name: param.name,
					type: elementType,
					typeName: elementTypeName,
				},
				"item",
			);

			// TODO: elementTypeName may need to be escaped here
			return `v.array(${ctx}, '${elementTypeName}', ${itemValidation})`;
		}
	}

	if (param.type.isTuple()) {
		const elementTypes = param.type.getTupleElements();
		const itemValidations = elementTypes.map((t) =>
			getValidationFunction(
				context,
				{
					name: param.name,
					type: t,
					typeName: t.getText(),
				},
				"item",
			)
		);

		return `v.tuple(${ctx}, '${param.typeName}', ${
			itemValidations.join(", ")
		})`;
	}

	const symbol = param.type.getSymbol();
	if (symbol && param.type.isClassOrInterface()) {
		const symbolName = symbol.getName();
		const valueDeclaration = symbol.getValueDeclaration();

		const isClass = param.type.isClass();
		const isInterface = param.type.isInterface();

		if (isClass) {
			const sourceFilePath = context.sourceFile.getFilePath();
			const isLocalClass = valueDeclaration?.getSourceFile().getFilePath()
				=== sourceFilePath;

			if (isLocalClass) {
				throw new Error(
					`Error transforming ${sourceFilePath}:
Local class ${param.typeName} must not be used as a parameter type for @validateArgs.
Use interfaces instead or move the class to a separate file.`,
				);
			}

			if (!valueDeclaration) {
				throw new Error(
					`Error transforming ${sourceFilePath}:
Class ${param.typeName} which is used as a parameter type for @validateArgs has no value declaration.`,
				);
			}

			const declarationSourceFile = valueDeclaration.getSourceFile();
			const importDeclaration = context.sourceFile.getImportDeclaration(
				(d) =>
					d.getModuleSpecifierSourceFile() === declarationSourceFile,
			);
			const namedImport = importDeclaration?.getNamedImports().find(
				(imp) => imp.getSymbol()?.getEscapedName() === param.typeName,
			);

			if (!importDeclaration || !namedImport) {
				throw new Error(
					`Error transforming ${sourceFilePath}:
Unable to find import specifier for class ${param.typeName}.`,
				);
			}

			const declaredName = namedImport.getName();
			const importedName = namedImport.getSymbol()!.getEscapedName();

			const importSpecifier = importDeclaration
				?.getModuleSpecifierValue();
			const importsForFile =
				context.additionalImports.get(importSpecifier)
					?? new Set();
			// TODO: We may need to namespace the import here
			// import { OriginalName as RenamedName } from "module";
			// TODO: Consider ignoring the rename, but make sure
			// not to introduce naming conflicts that way
			importsForFile.add([declaredName, importedName]);
			context.additionalImports.set(
				importSpecifier,
				importsForFile,
			);

			// The validation function needs to know the original name of the class
			// so it can try and find the built-in typeguard function
			return `v.class(${ctx}, "${declaredName}", ${param.typeName})`;
		}

		if (isInterface) {
			const variableDeclaration = valueDeclaration?.asKind(
				tsm.SyntaxKind.VariableDeclaration,
			);
			const isAmbient = !!variableDeclaration
				&& !!(variableDeclaration?.getCombinedModifierFlags()
					& tsm.ModifierFlags.Ambient);

			if (isAmbient && symbolName === "Date") {
				return `v.date(${ctx})`;
			}

			if (isAmbient && symbolName === "Uint8Array") {
				return `v.uint8array(${ctx})`;
			}

			// Collect all property definitions from all interface declarations
			const properties = symbol.getDeclarations()
				.map((d) => d.asKind(tsm.SyntaxKind.InterfaceDeclaration))
				.filter((d) => d != undefined)
				.flatMap((d) => d.getProperties())
				.map((p) => {
					return {
						name: p.getName(),
						type: p.getType(),
						typeName: p.getText(),
						// optional: p.hasQuestionToken(),
					};
				});

			const recurse = properties.map((p) =>
				`"${p.name}": ${
					getValidationFunction(
						context,
						p,
						"property",
					)
				}`
			);

			return `v.object(${ctx}, '${symbolName}', { ${
				recurse.join(", ")
			} })`;
		}
	}

	debugger;

	throw new Error(
		`Encountered unsupported type ${param.typeName} while transforming ${context.sourceFile.getFilePath()}`,
	);
}
