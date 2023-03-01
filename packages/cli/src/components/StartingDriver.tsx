import { Box, Text } from "ink";
import Spinner from "ink-spinner";

export interface StartingDriverProps {
	// TODO:
}

export const StartingDriver: React.FC<StartingDriverProps> = (props) => {
	return (
		<Box flexDirection="column" justifyContent="center">
			<Text>
				<Text color="green">
					<Spinner type="dots" />
				</Text>
				{" starting driver"}
			</Text>
		</Box>
	);
};
