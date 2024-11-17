import path from "node:path";
import { Project, type Type, ts as tsm } from "ts-morph";
import { type PluginConfig, type ProgramTransformerExtras } from "ts-patch";
import {
	type CompilerHost,
	type CompilerOptions,
	type Program,
	type SourceFile,
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
): CompilerHost & { fileCache: Map<string, SourceFile> } {
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

		for (
			const { methodName, className, parameters, options }
				of withMethodAndClassName
		) {
			const paramSpreadWithUnknown = parameters.map((p) =>
				`${p.name}: unknown`
			).join(", ");
			const paramSpread = parameters.map((p) => p.name).join(", ");
			newSourceText += `

export function validateArgs_${className}_${methodName}(options: any = {}) {
	return <T extends Function>(value: T, { kind }: ClassMethodDecoratorContext): T | void => {
		if (kind === "method") {
			return function ${methodName}(this: any, ${paramSpreadWithUnknown}) {
				v.assert(${
				parameters.map((p) => `
					${getValidationFunction(p, options)}(${p.name}),`).join(
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

function getValidationFunction(
	param: ParameterInfo,
	options: ValidateArgsOptions,
	kind: "parameter" | "item" | "object" | "property" = "parameter",
): string {
	const ctx = `{ kind: "${kind}", name: "${param.name}" }`;
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
		if (options.strictEnums) {
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
				{
					name: param.name,
					type: t,
					typeName: t.getText(),
				},
				options,
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

	const symbol = param.type.getSymbol();
	if (symbol && param.type.isInterface()) {
		const symbolName = symbol.getName();
		const valueDeclaration = symbol.getValueDeclaration();
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
					p,
					options,
					"property",
				)
			}`
		);

		return `v.object(${ctx}, '${symbolName}', { ${recurse.join(", ")} })`;
	}

	if (param.type.isArray()) {
		const elementType = param.type.getArrayElementType();
		if (elementType) {
			const elementTypeName = elementType.getText();
			const itemValidation = getValidationFunction(
				{
					name: param.name,
					type: elementType,
					typeName: elementTypeName,
				},
				options,
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
				{
					name: param.name,
					type: t,
					typeName: t.getText(),
				},
				options,
				"item",
			)
		);

		return `v.tuple(${ctx}, '${param.typeName}', ${
			itemValidations.join(", ")
		})`;
	}

	debugger;

	// FIXME: Define validation for all types
	return `((_: any) => ({ success: true }))`;
}
