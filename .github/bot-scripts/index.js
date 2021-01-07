module.exports = {
	fixLintOffer: (...args) => require("./fix-lint-offer")(...args),
	fixLintCheck: (...args) => require("./fix-lint-check")(...args),
	fixLintFeedback: (...args) => require("./fix-lint-feedback")(...args),
	updateIndexOffer: (...args) => require("./update-index-offer")(...args),
	updateIndexCheck: (...args) => require("./update-index-check")(...args),
	updateIndexFeedback: (...args) =>
		require("./update-index-feedback")(...args),
};
