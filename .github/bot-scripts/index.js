module.exports = {
	checkAuthorized: (...args) => require("./checkAuthorized")(...args),
	fixLintFeedback: (...args) => require("./fixLintFeedback")(...args),
	rebaseFeedback: (...args) => require("./rebaseFeedback")(...args),
};
