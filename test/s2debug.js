const {
	decryptAES128CCM,
	deriveNetworkKeys,
	computeNoncePRK,
	deriveMEI,
	CtrDRBG,
} = require("@zwave-js/core");

const homeId = 0xcfc2cc02;
const sender = 2;
const receiver = 1;

const securityKeys = {
	S0_Legacy: Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex"),
	S2_Unauthenticated: Buffer.from("5369389EFA18EE2A4894C7FB48347FEA", "hex"),
	S2_Authenticated: Buffer.from("656EF5C0F020F3C14238C04A1748B7E1", "hex"),
	S2_AccessControl: Buffer.from("31132050077310B6F7032F91C79C2EB8", "hex"),
};
for (const [key, value] of Object.entries(securityKeys)) {
	const { keyCCM, personalizationString } = deriveNetworkKeys(value);
	securityKeys[key] = { keyCCM, personalizationString };
	console.log(key, keyCCM.toString("hex"));
}

const cmd = Buffer.from(
	"012900a8000102209f035a011241f61c670d7adcf2113f5172afc4a2df4e7e34d6b93e9a616e35ab00a1f9",
	"hex",
);

const payloadLength = cmd[7];

let payload = cmd.slice(8, 8 + payloadLength);

const { keyCCM: key, personalizationString: pers } =
	securityKeys.S2_Authenticated;

const senderEI = Buffer.from("f61c670d7adcf2113f5172afc4a2df4e", "hex");
const receiverEI = Buffer.from("80f427f117933c7e77978219b7409f61", "hex");
const noncePRK = computeNoncePRK(senderEI, receiverEI);
const MEI = deriveMEI(noncePRK);
const rng = new CtrDRBG(128, false, MEI, undefined, pers);

function nextNonce() {
	return rng.generate(16).slice(0, 13);
}

const iv = nextNonce();
// const iv = Buffer.from("f82ac653abcef204e014f472f6", "hex");

// skip CC header
payload = payload.slice(2);
const seqNum = payload[0];
const hasExtensions = !!(payload[1] & 0b1);
const hasEncryptedExtensions = !!(payload[1] & 0b10);

let offset = 2;
let extensions = [];

function getAuthenticationData(
	sendingNodeId,
	destination,
	homeId,
	commandLength,
	unencryptedPayload,
) {
	const ret = Buffer.allocUnsafe(8 + unencryptedPayload.length);
	ret[0] = sendingNodeId;
	ret[1] = destination;
	ret.writeUInt32BE(homeId, 2);
	ret.writeUInt16BE(commandLength, 6);
	// This includes the sequence number and all unencrypted extensions
	unencryptedPayload.copy(ret, 8, 0);
	return ret;
}

const parseExtensions = (buffer) => {
	while (true) {
		// we need to read at least the length byte
		// validatePayload(buffer.length >= offset + 1);
		const extensionLength = buffer[offset];
		// Parse the extension
		const ext = buffer.slice(offset, offset + extensionLength);
		const moreToFollow = !!(ext[1] & 0b1000_0000);
		extensions.push(ext);
		offset += extensionLength;
		// Check if that was the last extension
		if (!moreToFollow) break;
	}
};
if (hasExtensions) parseExtensions(payload);

const unencryptedPayload = payload.slice(0, offset);
const ciphertext = payload.slice(offset, -8);
const authTag = payload.slice(-8);
const authData = getAuthenticationData(
	sender,
	receiver,
	homeId,
	payloadLength,
	unencryptedPayload,
);
console.log("authData", authData.toString("hex"));

const { plaintext, authOK } = decryptAES128CCM(
	key,
	iv,
	ciphertext,
	authData,
	authTag,
);

console.log("unenc payload", unencryptedPayload.toString("hex"));
console.log("ciphertext", ciphertext.toString("hex"));
console.log("plaintext", plaintext.toString("hex"));
console.log("authOK", authOK);

console.log(
	"unenc extensions",
	extensions.map((e) => e.toString("hex")),
);

extensions = [];

offset = 0;
if (hasEncryptedExtensions) parseExtensions(plaintext);
console.log(
	"enc extensions",
	extensions.map((e) => e.toString("hex")),
);

const decryptedCCBytes = plaintext.slice(offset);
console.log("payload", decryptedCCBytes.toString("hex"));
