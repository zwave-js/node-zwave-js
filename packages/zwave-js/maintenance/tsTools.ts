import * as path from "path";
import * as prettier from "prettier";
import ts from "typescript";

// Find this project's root dir
export const projectRoot = process.cwd();

export function loadTSConfig(): {
	options: ts.CompilerOptions;
	fileNames: string[];
} {
	const configFileName = ts.findConfigFile(
		path.join(__dirname, "../"),
		// eslint-disable-next-line @typescript-eslint/unbound-method
		ts.sys.fileExists,
		"tsconfig.build.json",
	);
	if (!configFileName) throw new Error("tsconfig.json not found");

	const configFileText = ts.sys.readFile(configFileName);
	if (!configFileText) throw new Error("could not read tsconfig.json");

	const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
		configFileName,
		{},
		ts.sys as any,
	);
	if (!parsedCommandLine) throw new Error("could not parse tsconfig.json");

	return {
		options: parsedCommandLine.options,
		fileNames: parsedCommandLine.fileNames,
	};
}

export function compareStrings(a: string, b: string): number {
	if (a > b) return 1;
	if (b > a) return -1;
	return 0;
}

// Make the linter happy
export function formatWithPrettier(
	filename: string,
	sourceText: string,
): string {
	const prettierOptions = {
		...require("../../../.prettierrc"),
		// To infer the correct parser
		filepath: filename,
	};
	return prettier.format(sourceText, prettierOptions);
}

export function updateModifiers<T extends ts.Node>(
	factory: ts.NodeFactory,
	s: T,
	add: ts.ModifierSyntaxKind[] | undefined,
	remove: ts.ModifierSyntaxKind[] | undefined,
): T {
	let modifiers = [...(s.modifiers ?? [])];
	if (remove?.length) {
		modifiers = modifiers.filter((m) => !remove.includes(m.kind));
	}
	if (add?.length) {
		const reallyNew = add.filter(
			(kind) => !modifiers.some((m) => m.kind === kind),
		);
		modifiers.push(...reallyNew.map((kind) => ts.createModifier(kind)));
	}

	if (ts.isVariableStatement(s)) {
		return (factory.updateVariableStatement(
			s,
			modifiers,
			s.declarationList,
		) as unknown) as T;
	} else if (ts.isTypeAliasDeclaration(s)) {
		return (factory.updateTypeAliasDeclaration(
			s,
			s.decorators,
			modifiers,
			s.name,
			s.typeParameters,
			s.type,
		) as unknown) as T;
	} else if (ts.isInterfaceDeclaration(s)) {
		return (factory.updateInterfaceDeclaration(
			s,
			s.decorators,
			modifiers,
			s.name,
			s.typeParameters,
			s.heritageClauses,
			s.members,
		) as unknown) as T;
	} else if (ts.isEnumDeclaration(s)) {
		return (factory.updateEnumDeclaration(
			s,
			s.decorators,
			modifiers,
			s.name,
			s.members,
		) as unknown) as T;
	} else if (ts.isClassDeclaration(s)) {
		return (factory.updateClassDeclaration(
			s,
			s.decorators,
			modifiers,
			s.name,
			s.typeParameters,
			s.heritageClauses,
			s.members,
		) as unknown) as T;
	} else if (ts.isFunctionDeclaration(s)) {
		return (factory.updateFunctionDeclaration(
			s,
			s.decorators,
			modifiers,
			s.asteriskToken,
			s.name,
			s.typeParameters,
			s.parameters,
			s.type,
			s.body,
		) as unknown) as T;
	}
	return s;
}
