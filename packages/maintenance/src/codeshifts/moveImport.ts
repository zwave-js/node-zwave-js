// Codemod to rename imports across the entire codebase.
// Run with jscodeshift: https://jscodeshift.com/run/cli/
// options:
//   from: the name of the import to rename
//   to: the new name of the import
//   typeOnly: whether to only rename type imports (optional, default false)

// examples: https://github.com/wingy3181/jscodeshift-examples/tree/master/src/examples

import {
	type API,
	type FileInfo,
	type JSCodeshift,
	type Options,
	type Transform,
} from "jscodeshift";

const transform: Transform = (
	file: FileInfo,
	api: API,
	{
		name,
		from,
		to,
	}: Options,
) => {
	if (!name || !to) {
		throw new Error("Both 'name' and 'to' are required options");
	}

	const j: JSCodeshift = api.jscodeshift;
	const root = j(file.source);

	const imp = root
		.find(
			j.ImportDeclaration,
			from && {
				source: {
					type: "StringLiteral",
					value: from,
				},
			},
		)
		.find(j.ImportSpecifier, {
			imported: {
				name: name,
			},
		});

	if (imp.length !== 1) return file.source;

	const decl = imp.closest(j.ImportDeclaration);

	const isTypeOnly = (imp.at(0).nodes()[0] as any).importKind === "type"
		|| decl.at(0).nodes()[0].importKind === "type";

	// Remove the found import from its parent
	imp.remove();
	// And remove all empty imports
	root
		.find(
			j.ImportDeclaration,
			from && {
				source: {
					type: "StringLiteral",
					value: from,
				},
			},
		).filter((path) => !path.value.specifiers?.length)
		.remove();

	// Try to find an existing import for the new specifier
	const targetDecl = root
		.find(
			j.ImportDeclaration,
			{
				source: {
					type: "StringLiteral",
					value: to,
				},
				...(isTypeOnly ? { importKind: "type" } : {}),
			},
		);

	if (targetDecl.length === 1) {
		targetDecl.at(0).get().node.specifiers.push(
			j.importSpecifier(j.identifier(name)),
		);
	} else {
		// Create the new import specifier
		root.find(j.Program).at(0).nodes()[0].body.unshift(
			j.importDeclaration(
				[j.importSpecifier(j.identifier(name))],
				j.stringLiteral(to),
				isTypeOnly ? "type" : "value",
			),
		);
	}

	return root.toSource();
};

export default transform;
export const parser = "ts";
