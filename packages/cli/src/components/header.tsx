import { Box, Text } from "ink";
import BigText from "ink-big-text";

export interface HeaderProps {
	usbPath?: string;
}

export const Header: React.FC<HeaderProps> = (props) => {
	return (
		<Box
			flexDirection="column"
			alignSelf="center"
			alignItems="flex-start"
			width="auto"
			paddingTop={2}
			marginBottom={2}
		>
			<BigText
				text="Z-Wave JS CLI"
				font="block"
				colors={["gray"]}
				space={false}
			/>
			<Text color="gray" dimColor>
				{" "}
				USB Path:{" "}
				{props.usbPath ? (
					<Text dimColor={false}>{props.usbPath}</Text>
				) : (
					"(none)"
				)}
			</Text>
		</Box>
	);
};
