// Enable Yarn PnP
require("../../.pnp.cjs").setup();

module.exports = {
	addCompatFlag: (...args) => require("./addCompatFlag")(...args),
	addCompatFlagCreatePR: (...args) =>
		require("./addCompatFlagCreatePR")(...args),
	approveWorkflows: (...args) => require("./approveWorkflows")(...args),
	checkAuthorized: (...args) => require("./checkAuthorized")(...args),
	fixLintFeedback: (...args) => require("./fixLintFeedback")(...args),
	getFixLintInfo: (...args) => require("./getFixLintInfo")(...args),
	rebaseFeedback: (...args) => require("./rebaseFeedback")(...args),
	renameCommitGetPRInfo: (...args) =>
		require("./renameCommitGetPRInfo")(...args),
	renameCommitCheck: (...args) => require("./renameCommitCheck")(...args),
	renameCommitFeedback: (...args) =>
		require("./renameCommitFeedback")(...args),
	importConfigCreatePR: (...args) =>
		require("./importConfigCreatePR")(...args),
};
