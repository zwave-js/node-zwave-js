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
		from,
		to,
		typeOnly = false,
	}: Options,
) => {
	if (!from || !to) {
		throw new Error("Both 'from' and 'to' are required options");
	}

	const j: JSCodeshift = api.jscodeshift;
	const root = j(file.source);

	const imp = root
		.find(
			j.ImportDeclaration,
			{ importKind: typeOnly ? "type" : undefined },
		)
		.find(j.ImportSpecifier, {
			imported: {
				name: from,
			},
		});

	return imp.replaceWith(({ node }) => {
		node.imported.name = to;
		return node;
	}).toSource();

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
