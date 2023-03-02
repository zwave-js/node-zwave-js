import { Box, DOMElement, measureElement } from "ink";
import {
	Children,
	PropsWithChildren,
	useEffect,
	useRef,
	useState,
} from "react";
import { getOuterBoxProps, OuterBoxProps } from "../lib/boxProps";

export interface LayerProps {
	zIndex?: number;
}

export const Layer: React.FC<React.PropsWithChildren<LayerProps>> = (props) => {
	return <>{props.children}</>;
};

export interface ZStackProps extends OuterBoxProps {}

export const ZStack: React.FC<PropsWithChildren<ZStackProps>> = (props) => {
	const { ...boxProps } = props;
	const ref = useRef<DOMElement>(null);
	const [width, setWidth] = useState<number>(0);
	const [height, setHeight] = useState<number>(0);

	// Always know the size of what we're rendering
	useEffect(() => {
		if (ref.current) {
			const { width, height } = measureElement(ref.current);
			setWidth(width);
			setHeight(height);
		}
	});

	const outerBoxProps = getOuterBoxProps(boxProps);

	const arrayChildren = Children.toArray(props.children);
	for (const child of arrayChildren) {
		if (typeof child !== "object" || !child || !("props" in child)) {
			throw new Error("ZStack children must be <Layer> elements");
		}
	}

	const sortedChildren = (arrayChildren as React.ReactElement[]).sort(
		(a, b) => (a.props.zIndex ?? 0) - (b.props.zIndex ?? 0),
	);

	return (
		<Box {...outerBoxProps} alignItems="stretch">
			<Box ref={ref} flexGrow={1} flexDirection="column">
				{sortedChildren?.map((child, i) => (
					<Box
						key={child.key}
						width={width}
						height={height}
						marginTop={i === 0 ? 0 : -height}
					>
						{child.props.children}
					</Box>
				))}
			</Box>
		</Box>
	);

	return <div>TODO</div>;
};
