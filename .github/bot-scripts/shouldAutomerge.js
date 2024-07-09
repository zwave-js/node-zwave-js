// @ts-check

/// <reference path="types.d.ts" />

// Example contents of updatedDependenciesJson
// [
// 	{
// 		dependencyName: 'prettier',
// 		dependencyType: 'direct:development',
// 		updateType: 'version-update:semver-patch',
// 		directory: '/prettier-and-types',
// 		packageEcosystem: 'npm_and_yarn',
// 		targetBranch: 'master',
// 		prevVersion: '',
// 		newVersion: '',
// 		compatScore: 0,
// 		alertState: '',
// 		ghsaId: '',
// 		cvss: 0
// 	},
// 	{
// 		dependencyName: '@types/prettier',
// 		dependencyType: 'direct:development',
// 		updateType: 'version-update:semver-patch',
// 		directory: '/',
// 		packageEcosystem: 'npm_and_yarn',
// 		targetBranch: 'master',
// 		prevVersion: '',
// 		newVersion: '',
// 		compatScore: 0,
// 		alertState: '',
// 		ghsaId: '',
// 		cvss: 0
// 	}
// ]

function shouldAutomerge(update) {
	return (
		// devDependencies: patch and minor
		(update.dependencyType === "direct:development"
			&& (update.updateType === "version-update:semver-patch"
				|| update.updateType === "version-update:semver-minor"))
		// production dependencies: patch
		|| (update.dependencyType === "direct:production"
			&& update.updateType === "version-update:semver-patch")
		// production dependencies: minor if security alert
		|| (update.dependencyType === "direct:production"
			&& update.updateType === "version-update:semver-minor"
			&& update.alertState === "OPEN")
		// indirect dependencies: minor if security alert
		|| (update.dependencyType === "indirect"
			&& (update.updateType === "version-update:semver-patch"
				|| update.updateType === "version-update:semver-minor")
			&& update.alertState === "OPEN")
	);
}

async function main() {
	/** @type {any[]} */
	const updates = JSON.parse(
		/** @type {string} */
		(process.env.updatedDependenciesJson),
	);

	if (!updates.length) return false;

	return updates.every(shouldAutomerge);
}
module.exports = main;
