// @ts-expect-error Node.js 18 is missing the types for this
const webcrypto = globalThis.crypto as typeof import("node:crypto").webcrypto;
export { webcrypto };
