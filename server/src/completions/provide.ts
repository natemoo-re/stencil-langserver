import { CompletionItemKind, TextDocumentIdentifier } from 'vscode-languageserver';
import { LIFECYCLE_METHODS } from './lifecycle-methods';
import { DECORATORS } from './decorators';
import { METHODS } from './methods';

export function ComponentCompletions(textDocument: TextDocumentIdentifier, documentMeta: { methodNames: string[] }): any[] {
    const { methodNames } = documentMeta;
    return [
        ...LIFECYCLE_METHODS
            .filter(method => !methodNames.includes(method.label))
            .map(method => (
                {
                    label: method.label,
                    kind: CompletionItemKind.Method,
                    data: {
                        id: method.id,
                        textDocument: textDocument
                    }
                }
            )),
        ...DECORATORS.map(decorator => (
            {
                label: decorator.label,
                kind: CompletionItemKind.Function,
                data: {
                    id: decorator.id,
                    textDocument: textDocument
                }
            }
        )),
        ...METHODS
            .filter(method => !methodNames.includes(method.label))
            .map(method => (
                {
                    label: method.label,
                    kind: CompletionItemKind.Method,
                    data: {
                        id: method.id,
                        textDocument: textDocument
                    }
                }
            ))
    ]
}