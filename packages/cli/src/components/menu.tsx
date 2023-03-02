import { Box, BoxProps, Text, TextProps, useInput } from "ink";

export interface MenuProps {
	label?: string;
	layoutProps?: BoxProps;
	textProps?: TextProps;
	options: {
		input: string;
		label: string;
		textProps?: TextProps;
		onSelect: () => void;
	}[];
}

export const Menu: React.FC<MenuProps> = (props) => {
	const { options } = props;
	useInput((input, key) => {
		const option = options.find((o) => o.input === input);
		if (option) {
			option.onSelect();
		}
	});

	const innerBox = (
		<Box
			{...((!props.label && props.layoutProps) || {})}
			flexDirection="column"
			paddingY={1}
			paddingX={4}
			borderStyle="round"
		>
			{options.map(({ input, label, textProps }) => (
				<Text key={input} {...(textProps ?? props.textProps ?? {})}>
					{input}. {label}
				</Text>
			))}
		</Box>
	);

	if (props.label) {
		return (
			<Box
				alignSelf="center"
				{...(props.layoutProps || {})}
				flexDirection="column"
			>
				<Text>{props.label}</Text>
				{innerBox}
			</Box>
		);
	} else {
		return innerBox;
	}
};
