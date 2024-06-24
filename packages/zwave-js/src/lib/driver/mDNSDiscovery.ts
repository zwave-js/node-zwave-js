import { isArray, isObject } from "alcalzone-shared/typeguards";
import createMDNSServer from "mdns-server";

export interface RemoteSerialPort {
	port: string;
	info: Record<string, string>;
}

const domain = "_zwave._tcp.local";

export function discoverRemoteSerialPorts(
	timeout: number | false = 1000,
): Promise<RemoteSerialPort[] | undefined> {
	const mdns = createMDNSServer({
		reuseAddr: true,
		loopback: false,
		noInit: true,
		ttl: 10,
	});
	let timer: NodeJS.Timeout | undefined;

	return new Promise((resolve, reject) => {
		mdns.on("response", (resp) => {
			const matches = resp.answers
				.filter(
					(n) =>
						n.type === "PTR"
						&& n.name === domain
						&& typeof n.data === "string",
				)
				.map(({ data }) => {
					return {
						txt: resp.answers.find(
							(n) => n.type === "TXT" && n.name === data,
						) ?? resp.additionals.find(
							(n) => n.type === "TXT" && n.name === data,
						),
						srv: resp.answers.find(
							(n) => n.type === "SRV" && n.name === data,
						) ?? resp.additionals.find(
							(n) => n.type === "SRV" && n.name === data,
						),
					};
				})
				.filter(
					({ srv }) =>
						!!srv
						&& isObject(srv.data)
						&& typeof srv.data.target === "string"
						&& typeof srv.data.port === "number",
				)
				.map(({ txt, srv }) => {
					const info: Record<string, string> = {};
					if (!!txt && isArray(txt.data)) {
						const strings = (txt.data as unknown[])
							.filter((d) => Buffer.isBuffer(d))
							.map((d) => d.toString())
							.filter((d) => d.includes("="));

						for (const string of strings) {
							const [key, value] = string.split("=", 2);
							info[key] = value;
						}
					}
					const addr = srv!.data as { target: string; port: number };
					const port = `tcp://${addr.target}:${addr.port}`;

					return {
						port,
						info,
					};
				});

			if (matches.length) {
				clearTimeout(timer);
				resolve(matches);
			}
		});

		mdns.on("ready", () => {
			mdns.query([
				{ name: domain, type: "PTR" },
				{ name: domain, type: "SRV" },
				{ name: domain, type: "TXT" },
			]);
		});

		mdns.on("error", reject);

		mdns.initServer();

		if (typeof timeout === "number" && timeout > 0) {
			timer = setTimeout(() => {
				mdns.destroy();
				resolve(undefined);
			}, timeout);
		}
	});
}
