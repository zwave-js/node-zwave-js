// Don't let unhandled rejections slip through during tests
process.on("unhandledRejection", (r) => {
	throw r;
});
