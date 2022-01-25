// Little workaround to support TypeScript workers
require("esbuild-register");
module.exports = require("./generateTypedDocs");
