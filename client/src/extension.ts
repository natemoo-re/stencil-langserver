/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';

import { workspace, ExtensionContext, languages, CompletionItem } from 'vscode';

import {
	LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, TextDocument, Position
} from 'vscode-languageclient';
import * as ts from 'typescript';
import * as css from 'vscode-css-languageservice';

let client: LanguageClient;

export function activate(context: ExtensionContext) {

	const service = css.getCSSLanguageService();

	// The server is implemented in node
	let serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
	// The debug options for the server
	let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'typescriptreact'}],
		synchronize: {
			// Notify the server about file changes to **/*.tsx files contain in the workspace
			fileEvents: [
				workspace.createFileSystemWatcher('**/stencil.config.{ts,js}'),
				workspace.createFileSystemWatcher('**/*.tsx')
			]
		}
	}

	// Create the language client and start the client.
	client = new LanguageClient('languageServerExample', 'Stencil Language Server', serverOptions, clientOptions);

	// Start the client. This will also launch the server
	client.start();

	attachCSSLanguageServiceToStyle(service);
}

function attachCSSLanguageServiceToStyle(service: css.LanguageService) {
	
	languages.registerCompletionItemProvider(['typescriptreact'], {
		provideCompletionItems(doc, pos) {
			const offset = doc.offsetAt(pos);
			const source = ts.createSourceFile(doc.fileName, doc.getText(), ts.ScriptTarget.Latest, true);

			let token = (ts as any).getTokenAtPosition(source, offset)
			let template: ts.TaggedTemplateExpression;
			while (token) {
				if (token.kind === ts.SyntaxKind.TemplateExpression) {
					template = token;
					break;
				}
				token = token.parent;
			}

			if (!template
				|| template.tag.getText() !== 'style'
				|| (offset < template.template.pos && offset > template.template.end)
			) {
				return;
			}

			const content = template.template.getText().slice(1, -1);
			const embeddedDoc = TextDocument.create(doc.uri.with({ scheme: 'html-fake' }).toString(), 'html', doc.version, content);
			const stylesheet = service.parseStylesheet(embeddedDoc);

			const list = service.doComplete(embeddedDoc, Position.create(0, offset - template.template.pos - 1), stylesheet);

			return list.items.map(item => {
				// translate to vscode items
				return new CompletionItem(item.label);
			})
		}
	});

}

export function deactivate(): Thenable<void> {
	if (!client) {
		return undefined;
	}
	return client.stop();
}