import { Text } from "ink";
import { useGlobals } from "../hooks/useGlobals";

export const USBPathInfo: React.FC = () => {
	const { usbPath } = useGlobals();
	return (
		<Text bold={false} dimColor>
			USB Path: {usbPath || "(none)"}
		</Text>
	);
};
