import { TextDocumentIdentifier, Position, CompletionItem, Diagnostic, DocumentLink, MarkupKind } from "vscode-languageserver";
import { ProjectManager } from '../project-manager';
import * as ts from 'typescript';

import { Completion } from './features/completions';

export class StencilService {
	
	constructor(private projectManager: ProjectManager) { }
	
	getCompletionItems(textDocument: TextDocumentIdentifier, position: Position): CompletionItem[] {
		const sourceFile = this.projectManager.getSourceFile(textDocument);
		const offset = ts.getPositionOfLineAndCharacter(sourceFile, position.line, position.character);
		const container = Completion.getNodeContainingPosition(sourceFile, offset);

		if (!container) return [];
		
		const metadata = this.projectManager.getMetadata(textDocument);
		return Completion.getByNode(container, { existingComponentMethods: metadata.methods })
			.map(Completion.addData({ textDocument }));
	}

	resolveCompletionItem(item: CompletionItem): CompletionItem {
		if (item.data && item.data.resolve) {
			// Resolve additionalTextEdits for Decorators with AutoImport support
			if (item.data.autoImport) {
				const { stencilImport } = this.projectManager.getMetadata({ uri: item.data.textDocument.uri });
				item.additionalTextEdits = Completion.buildAdditionalTextEdits(stencilImport, item.data.autoImport);
			}
			
			// Do placeholder replacements based on Label name
			switch (item.label) {
				case 'render':
					const { componentOptions } = this.projectManager.getMetadata(item.data.textDocument.uri);
					item.insertText = item.insertText.replace(/{{componentTag}}/g, componentOptions.tag);
					break;
				case 'Watch':
					const { props, states, watched } = this.projectManager.getMetadata(item.data.textDocument.uri);
					const computedProps = [...props, ...states].filter(x => !watched.includes(x));

					if (computedProps.length > 1) {
						item.insertText = item.insertText.replace('{{computedProps}}', `|${computedProps.join(',')}|`);
					} else if (computedProps.length === 1) {
						item.insertText = item.insertText.replace('{{computedProps}}', `:${computedProps[0]}`);
					} else {
						item.insertText = item.insertText.replace('{{computedProps}}', `:propName`);
					}
					break;
				default: break;
			}
		}

		return item;
	}

	getDocumentLinks(textDocument: TextDocumentIdentifier): DocumentLink[] {
		return [];
	}

	getDiagnostics(textDocument: TextDocumentIdentifier): Diagnostic[] {
		return [];
	}

}