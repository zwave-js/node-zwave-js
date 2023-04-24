#!/usr/bin/env node

var net = require("net");

const args = process.argv.slice(2);

var stream = net.connect("/tmp/zwave-js-test.sock");
stream.write(args.join(" "));
stream.end();
