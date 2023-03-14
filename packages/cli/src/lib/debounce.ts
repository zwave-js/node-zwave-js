export function debounce<Args extends any[]>(
	fn: (...args: Args) => void,
	delay: number,
) {
	let timer: NodeJS.Timeout;
	return (...args: Args) => {
		clearTimeout(timer);
		timer = setTimeout(fn as any, delay, ...args);
	};
}
