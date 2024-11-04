import { Bridge_6_6x } from "./Bridge_6_6x.js";
import { Bridge_6_7x } from "./Bridge_6_7x.js";
import { Bridge_6_8x } from "./Bridge_6_8x.js";
import { Static_6_6x } from "./Static_6_6x.js";
import { Static_6_7x } from "./Static_6_7x.js";
import { Static_6_8x } from "./Static_6_8x.js";

export const nvm500Impls = [
	Bridge_6_6x,
	Bridge_6_7x,
	Bridge_6_8x,
	Static_6_6x,
	Static_6_7x,
	Static_6_8x,
] as const;
