/** limits a value to the range given by min/max */
export function clamp(value: number, min: number, max: number): number {
	if (min > max) {
		[min, max] = [max, min];
	}
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

export function roundTo(value: number, digits: number): number {
	const exp = Math.pow(10, digits);
	return Math.round(value * exp) / exp;
}

// export interface Point {
// 	x: number;
// 	y: number;
// }
// export type Vector = Point;
// export interface Edge extends Array<Point> {
// 	0: Point;
// 	1: Point;
// }
// export interface Triangle extends Array<Point> {
// 	0: Point;
// 	1: Point;
// 	2: Point;
// }

// /**
//  * Tests if a point is inside a given triangle
//  */
// export function pointInTriangle(triangle: Triangle, point: Point): boolean {
// 	// based on http://totologic.blogspot.de/2014/01/accurate-point-in-triangle-test.html
// 	const [
// 		{x: x1, y: y1},
// 		{x: x2, y: y2},
// 		{x: x3, y: y3},
// 	] = triangle;
// 	const {x, y} = point;
// 	const denominator = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3));
// 	const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / denominator;
// 	const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / denominator;
// 	const c = 1 - a - b;

// 	return 0 <= a && a <= 1 && 0 <= b && b <= 1 && 0 <= c && c <= 1;
// }

// export function distanceSquared(a: Point, b: Point) {
// 	return (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
// }

// export function findClosestTriangleEdge(point: Point, triangle: Triangle): Edge {
// 	const distances = triangle.map(p => distanceSquared(p, point));
// 	const maxDistance = Math.max(...distances);
// 	for (let i = 0; i < distances.length; i++) {
// 		if (distances[i] === maxDistance) {
// 			triangle.splice(i, 1);
// 			return triangle;
// 		}
// 	}
// 	return [triangle[0], triangle[1]];
// }

// export function dotProduct(v1: Vector, v2: Vector): number {
// 	return v1.x * v2.x + v1.y * v2.y;
// }

// export function subtractVector(a: Vector, b: Vector): Vector {
// 	return {
// 		x: a.x - b.x,
// 		y: a.y - b.y,
// 	};
// }

// export function addVector(v1: Vector, v2: Vector): Vector {
// 	return {
// 		x: v1.x + v2.x,
// 		y: v1.y + v2.y,
// 	};
// }

// export function scaleVector(v: Vector, factor: number): Vector {
// 	return {
// 		x: factor * v.x,
// 		y: factor * v.y,
// 	};
// }

// export function projectPointOnEdge(point: Point, edge: Edge): Point {
// 	const [a, b] = edge;
// 	const c = point;
// 	const ac = subtractVector(c, a);
// 	const ab = subtractVector(b, a);
// 	let s = dotProduct(ac, ab) / dotProduct(ab, ab);
// 	s = clamp(s, 0, 1);
// 	return addVector(a, scaleVector(ab, s));
// }
