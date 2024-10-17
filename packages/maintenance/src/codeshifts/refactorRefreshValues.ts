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
	type Identifier,
	type JSCodeshift,
	type Options,
	type Transform,
} from "jscodeshift";

const transform: Transform = (
	file: FileInfo,
	api: API,
	{}: Options,
) => {
	const j: JSCodeshift = api.jscodeshift;
	const root = j(file.source);

	const ccImplementations = root.find(j.ClassDeclaration, {
		superClass: {
			name: "CommandClass",
		},
	});

	const methods = ccImplementations.find(j.ClassMethod, {
		kind: "method",
	}).filter(({ node }) => {
		return node.key.type === "Identifier"
			&& (node.key.name === "refreshValues")
			&& node.params.length >= 1
			&& node.params[0].type === "Identifier"
			&& node.params[0].name === "applHost"
			&& node.params[0].typeAnnotation?.type === "TSTypeAnnotation"
			&& node.params[0].typeAnnotation.typeAnnotation.type
				=== "TSTypeReference"
			&& node.params[0].typeAnnotation.typeAnnotation.typeName.type
				=== "Identifier"
			&& node.params[0].typeAnnotation.typeAnnotation.typeName.name
				=== "ZWaveApplicationHost";
	});

	if (!methods.length) return file.source;

	methods.replaceWith(({ node }) => {
		const ident = node.params[0] as Identifier;
		ident.name = "ctx";
		// @ts-expect-error
		ident.typeAnnotation.typeAnnotation.typeName.name =
			"RefreshValuesContext";
		return node;
	});

	const paramUsages = methods.find(j.Identifier, {
		name: "applHost",
	});
	paramUsages.replaceWith(({ node }) => {
		node.name = "ctx";
		return node;
	});

	const targetDecl = root
		.find(
			j.ImportDeclaration,
			{
				source: {
					type: "StringLiteral",
					value: "../lib/CommandClass",
				},
			},
		);
	targetDecl.at(0).get().node.specifiers.push(
		j.importSpecifier(j.identifier("RefreshValuesContext")),
	);

	return root.toSource();

	// const imp = root
	// 	.find(
	// 		j.ImportDeclaration,
	// 		{ importKind: typeOnly ? "type" : undefined },
	// 	)
	// 	.find(j.ImportSpecifier, {
	// 		imported: {
	// 			name: from,
	// 		},
	// 	});

	// return imp.replaceWith(({ node }) => {
	// 	node.imported.name = to;
	// 	return node;
	// }).toSource();

	//   return (
	//     j(file.source)
	//       .find(j.FunctionDeclaration)
	//       // Target a particular function declaration
	//       .filter(({ node: functionDeclaration }) => functionDeclaration.id.name === functionName)
	//       .replaceWith(({ node: functionDeclaration }) => {
	//         // Create a function call expression statement
	//         const functionCallExpressionStatement = j.expressionStatement(
	//           j.callExpression(j.identifier(functionNameToCall), [])
	//         );

	//         // Create a comment and add it as a leading comment to the function call expression
	//         const commentLine = j.commentLine(comment);
	//         functionCallExpressionStatement.comments = [commentLine];

	//         // Append the function call expression to the function declaration's existing body
	//         functionDeclaration.body.body = [...functionDeclaration.body.body, functionCallExpressionStatement];
	//         return functionDeclaration;
	//       })
	//       .toSource()
	//   );
};

export default transform;
export const parser = "ts";
