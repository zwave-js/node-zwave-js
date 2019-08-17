require("reflect-metadata");
// @ts-check
const data = Buffer.from("010e000400020872050086000200828e", "hex");
require("../build/index");
const { Message } = require("../build/lib/message/Message");
const msg = Message.from({ getSafeCCVersionForNode: () => 100 }, data);
