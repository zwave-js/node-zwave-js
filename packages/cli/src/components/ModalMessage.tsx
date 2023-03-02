import {
	Box,
	DOMElement,
	measureElement,
	Text,
	TextProps,
	useInput,
} from "ink";
import {
	ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Center } from "./Center.js";

export interface ModalMessageState {
	message: ReactNode;
	color?: TextProps["color"];
}

export interface ModalMessageProps {
	color?: TextProps["color"];
	onContinue: () => void;
}

export const ModalMessage: React.FC<
	React.PropsWithChildren<ModalMessageProps>
> = (props) => {
	useInput((input, key) => {
		if (key.return) {
			props.onContinue();
		}
	});

	const ref = useRef<DOMElement>(null);
	const [height, setHeight] = useState<number>(0);
	const [text, setText] = useState<string>("");

	const updateSize = useCallback(() => {
		if (ref.current) {
			const { width, height } = measureElement(ref.current);
			setHeight(height);
			if (
				height === 0 ||
				width === 0 ||
				Number.isNaN(height) ||
				Number.isNaN(width)
			) {
				setText("");
			} else {
				const text = new Array(height)
					.fill(" ".repeat(width))
					.join("\n");
				setText(text);
			}
		}
	}, [ref.current]);

	useEffect(updateSize);
	// useEffect(updateSize, [ref.current]);
	useLayoutEffect(updateSize);

	return (
		<Center>
			<Box marginBottom={-height}>
				<Text>{text}</Text>
			</Box>
			<Box
				flexDirection="column"
				borderColor={props.color ?? "white"}
				borderStyle="round"
				paddingY={1}
				paddingX={2}
				ref={ref}
			>
				<Text color={props.color}>{props.children}</Text>
				<Text> </Text>
				<Text color="gray">
					Press <Text bold>ENTER</Text> to continue...
				</Text>
			</Box>
		</Center>
	);
};
