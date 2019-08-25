require("reflect-metadata");
// @ts-check
const data = Buffer.from("010d0004000607600d01012503ff43", "hex");
require("../build/index");
const { Message } = require("../build/lib/message/Message");
console.log(Message.getMessageLength(data));
const msg = Message.from({ getSafeCCVersionForNode: () => 100 }, data);
