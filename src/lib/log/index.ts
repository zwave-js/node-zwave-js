import * as winston from "winston";
import "./Serial";

winston.loggers.get("serial").log("info", "test");
