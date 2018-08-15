import * as ts from 'typescript';

export function flatten(value: string[] | string): string {
	return Array.isArray(value) ? value.join('\n') : value;
}

export function getDecoratorName(node: ts.Decorator): string {
	if (!ts.isDecorator(node)) return undefined;

	return ts.isIdentifier(node.expression) && node.expression.text;
}