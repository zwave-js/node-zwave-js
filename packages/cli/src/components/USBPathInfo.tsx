import { Text } from "ink";
import { useGlobals } from "../hooks/useGlobals.js";

export const USBPathInfo: React.FC = () => {
	const { usbPath } = useGlobals();
	return usbPath ? (
		<Text bold={false} dimColor>
			{usbPath}
		</Text>
	) : null;
};
