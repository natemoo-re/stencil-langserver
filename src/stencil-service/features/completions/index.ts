import * as ts from 'typescript';
import { CompletionItem, CompletionItemKind, TextDocumentIdentifier, TextDocument } from 'vscode-languageserver';
import { DECORATORS, METHODS, LIFECYCLE_METHODS } from './component';
import { getDecoratorName } from './util';

class Completions {

	private COMPONENT: CompletionItem[] = [...DECORATORS, ...METHODS, ...LIFECYCLE_METHODS];

	getNodeContainingPosition(sourceFile: ts.SourceFile, position: number) {
		let container: ts.Node;

		function visit(node: ts.Node) {
			if (node.pos < position && position < node.end) {
				node.parent = container;
				container = node;
				node.forEachChild(visit);
			}
		}

		sourceFile.forEachChild(visit);
		return container;
	}

	private getByDecorator(name: string): CompletionItem[] {
		const completions = [];
		switch (name) {
			case '':
				break;
			default: break;
		}
		return completions;
	}

	getByNode(node: ts.Node, context: { existingComponentMethods: string[] }): CompletionItem[] {
		const completions = [];
		switch (node.kind) {
			case ts.SyntaxKind.ClassDeclaration: 
				completions.push(...this.COMPONENT.filter(this.filterUnused(context.existingComponentMethods)));
				break;
			case ts.SyntaxKind.CallExpression:
				if (ts.isDecorator(node.parent)) {
					completions.push(...this.getByDecorator(getDecoratorName(node.parent)));
				}
				break;
			case ts.SyntaxKind.ObjectLiteralExpression:
				if (ts.isCallExpression(node.parent) && ts.isDecorator(node.parent.parent)) {
					completions.push(...this.getByDecorator(getDecoratorName(node.parent.parent)));
				}
				break;
			// case ts.SyntaxKind.Block:
			// 	// Special completions inside of specific methods?
			// 	break;
			default: break;
		}
		return completions;
	}

	private filterUnused(used: string[]) {
		return (completion: CompletionItem) => completion.data && completion.data.isFilterable && !used.includes(completion.label)
	}

	public addData(additionalData: { [key: string]: any }) {
		return (completion: CompletionItem) => {
			completion.data = Object.assign({}, completion.data, additionalData);
			return completion;
		}
	}

}

export const Completion = new Completions();