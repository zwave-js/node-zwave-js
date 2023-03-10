import { Text } from "ink";
import Spinner from "ink-spinner";
import { useEffect } from "react";
import { Center } from "../components/Center.js";
import { useDialogs } from "../hooks/useDialogs.js";
import { useDriver } from "../hooks/useDriver.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";

export interface RemoveFailedNodePageProps {
	nodeId: number;
}

export const RemoveFailedNodePage: React.FC<RemoveFailedNodePageProps> = (
	props,
) => {
	const { driver } = useDriver();
	const { navigate } = useNavigation();
	const { showError, showSuccess } = useDialogs();

	useEffect(() => {
		(async () => {
			try {
				await driver.controller.removeFailedNode(props.nodeId);
				showSuccess(`Node ${props.nodeId} removed!`);
			} catch (e: any) {
				showError(`Failed to remove node: ${e.message}`);
			} finally {
				navigate(CLIPage.MainMenu);
			}
		})();
	}, []);

	return (
		<Center>
			<Text>
				<Text color="red">
					<Spinner type="dots" />
				</Text>{" "}
				Removing failed node {props.nodeId}...
			</Text>
		</Center>
	);
};
