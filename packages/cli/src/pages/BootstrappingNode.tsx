import { SecurityClass } from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import { Text } from "ink";
import Spinner from "ink-spinner";
import { Center } from "../components/Center.js";
import { useDialogs } from "../hooks/useDialogs.js";
import { useControllerEvent } from "../hooks/useDriver.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";

export interface BootstrappingNodePageProps {
	nodeId: number;
}

export const BootstrappingNodePage: React.FC<BootstrappingNodePageProps> = (
	props,
) => {
	const { navigate } = useNavigation();
	const { showWarning, showSuccess } = useDialogs();

	useControllerEvent("node added", (node, result) => {
		if (result.lowSecurity) {
			showWarning(
				`Node ${node.id} was added with lower than intended security!`,
			);
		} else {
			let message: string = `Node ${node.id} was added!`;
			const secClass = node.getHighestSecurityClass();
			if (secClass && secClass > SecurityClass.None) {
				message += ` Security class: ${getEnumMemberName(
					SecurityClass,
					secClass,
				)}`;
			}
			showSuccess(message);
		}
		navigate(CLIPage.DeviceOverview);
	});

	return (
		<Center>
			<Text>
				<Text color="green">
					<Spinner type="dots" />
				</Text>{" "}
				Found node {props.nodeId}, bootstrapping...
			</Text>
		</Center>
	);
};
