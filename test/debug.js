require("reflect-metadata");
// @ts-check
const data = Buffer.from("010e000400040891010f260303000040", "hex");
require("../build/index");
const { Message } = require("../build/lib/message/Message");
console.log(Message.getMessageLength(data));
const msg = Message.from({ getSafeCCVersionForNode: () => 100 }, data);
