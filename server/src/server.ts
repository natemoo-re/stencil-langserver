/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	createConnection, TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
	ProposedFeatures, InitializeParams, DidChangeConfigurationNotification, CompletionItem,
	CompletionItemKind, TextDocumentPositionParams, InsertTextFormat, MarkupKind, TextDocumentIdentifier,
	Range, Position,
	DocumentLink,
	Definition,
	Location
} from 'vscode-languageserver';
import * as ts from 'typescript';
import { LIFECYCLE_METHODS } from './completions/lifecycle-methods';
import { DECORATORS } from './completions/decorators';
import { METHODS } from './completions/methods';
import getAutoImportEdit from './auto-import';
import { getAutoImport } from './auto-import/util';
import { flatten, isComponentDecorator, getComponentDecoratorOptions } from './util';
import { walkAST } from './ast';
import { getPositionOfLineAndCharacter, createSourceFile, ScriptTarget } from '../../node_modules/typescript';
// import { getPreviousToken, getTokenAtPosition } from "tsutils";
import { getNodeContainingPosition } from './util';
import { ComponentCompletions } from "./completions/provide";
import * as path from 'path';
import * as fs from 'fs';
import { uri2path } from './util';
import * as multimatch from 'multimatch';

// import { COMPONENT_SNIPPETS } from './completions/snippets';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;
	hasWorkspaceFolderCapability = capabilities.workspace && !!capabilities.workspace.workspaceFolders;
	hasDiagnosticRelatedInformationCapability = capabilities.textDocument && capabilities.textDocument.publishDiagnostics && capabilities.textDocument.publishDiagnostics.relatedInformation;

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
            // Tell the client that the server supports code completion
            completionProvider: {
				resolveProvider: true,
				triggerCharacters: ['"', "'", '/', ':']
			},
			documentLinkProvider: {
				resolveProvider: true
			},
			implementationProvider: true,
			definitionProvider: true
		}
	}
});

connection.onImplementation((params): Definition => {
	connection.console.log('Implementation');
	const p = params;
	return null;
})

const isJSXElement = (node: ts.Node, checkParent = true): boolean => ts.isJsxOpeningLikeElement(node) || ts.isJsxClosingElement(node) || ts.isJsxClosingFragment(node) || checkParent && node.parent && isJSXElement(node.parent, false);
const isCustomElement = (node: ts.Node, sourceFile: ts.SourceFile): boolean => node.getText(sourceFile).indexOf('-') > -1;

const componentFileMap = new Map<string, string>();

connection.onDefinition((_textDocumentPosition): Definition => {
	const document = documents.get(_textDocumentPosition.textDocument.uri);
	const sourceFile = createSourceFile(_textDocumentPosition.textDocument.uri, document.getText(), ScriptTarget.ES2017);
	const position = getPositionOfLineAndCharacter(sourceFile, _textDocumentPosition.position.line, _textDocumentPosition.position.character);
	const containingNode = getNodeContainingPosition(sourceFile, position);
	
	if (containingNode && isJSXElement(containingNode) && isCustomElement(containingNode, sourceFile)) {
		const tag = containingNode.getText(sourceFile).replace(/^\<\/?/, '').replace(/\/?\>$/, '').trim();
		if (componentFileMap.has(tag)) {
			return Location.create(componentFileMap.get(tag), componentRangeCache.get(_textDocumentPosition.textDocument.uri));
		}
	}
	return null;
})

connection.onInitialized(async () => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders((_event) => {
			connection.console.log('Workspace folder change event received.');
		});
	}

	connection.console.log('Initialized');
	// const filter: DocumentFilter = { pattern: '**/stencil.config.{js,ts}' };
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(change.settings.languageServerExample || defaultSettings);
	}
	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({ scopeUri: resource, section: 'languageServerExample' });
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

interface DocumentMeta {
	componentMeta: any,
	tag: { value: string, range: Range },
	version: number,
	autoImport: { range: Range, multiline: boolean, imports: string[] },
	classPosition: { start: number, end: number },
	componentPosition: { start: number, end: number };
	classMemberPositions: { start: number, end: number }[],
	properties: string[],
	stateNames: string[],
	methodNames: string[],
	watchedNames: string[],
	render: { start: number, end: number, returnsJSX: boolean };
	referencedDocuments: { start: number, end: number, referenceUri: string }[];
}
// Create a cache that stores metadata about a document
let documentsMetaCache: Map<string, DocumentMeta> = new Map();
let componentRangeCache: Map<string, Range> = new Map();

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	validateTextDocument(change.document);
});

function getDocumentMeta(resourceUri: string): DocumentMeta {
	let result = documentsMetaCache.get(resourceUri);
	const document = documents.get(resourceUri);
	if (!result || document.version !== result.version) {
		const astResult = walkAST(document);
		// connection.console.log(JSON.stringify(astResult.componentMeta, null, 2));
		result = {
			componentMeta: astResult.componentMeta,
			tag: { value: astResult.tag, range: astResult.componentRange },
			autoImport: getAutoImport(document),
			componentPosition: astResult.componentPosition,
			classPosition: astResult.insideClass,
			classMemberPositions: astResult.insideClassMethod,
			render: astResult.render,
			version: document.version,
			properties: astResult.properties,
			stateNames: astResult.stateNames,
			methodNames: astResult.methodNames,
			watchedNames: astResult.watchedNames,
			referencedDocuments: astResult.referencedDocuments
		};
		// connection.console.log(`${JSON.stringify(result.autoImport, null, 2)}`);
		documentsMetaCache.set(resourceUri, result);
		componentFileMap.set(result.tag.value, resourceUri);
		componentRangeCache.set(resourceUri, result.tag.range);
	}
	return result;
}

export const STENCIL_DIAGNOSTIC_SOURCE = 'stencil';
export enum STENCIL_ERROR {
	MISSING_RENDER = 0,
	RENDER_RETURN_JSX,
	FILE_NOT_FOUND
}

const diagnosticCache = new Map<string, Diagnostic[]>();

function diagnosticExists(code: STENCIL_ERROR): (value: Diagnostic, index?: number, array?: Diagnostic[]) => boolean {
	return (diagnostic: Diagnostic) => diagnostic.code !== code;
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);
	let meta = getDocumentMeta(textDocument.uri);

	let problems = 0;
	let diagnostics: Diagnostic[] = [];
	while (problems < settings.maxNumberOfProblems) {
		problems++;

		if (meta.componentMeta.tag.indexOf('-') == -1) {
			let diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: {
					start: textDocument.positionAt(meta.componentPosition.start),
					end: textDocument.positionAt(meta.componentPosition.end)
				},
				message: `Component must include a 'render()' method`,
				source: STENCIL_DIAGNOSTIC_SOURCE,
				code: STENCIL_ERROR.MISSING_RENDER,
			};
			diagnostics.push(diagnostic);
		}

		// if (!meta.methodNames.includes('render') && diagnostics.every(diagnosticExists(STENCIL_ERROR.MISSING_RENDER))) {
		// 	let diagnostic: Diagnostic = {
		// 		severity: DiagnosticSeverity.Error,
		// 		range: {
		// 			start: textDocument.positionAt(meta.componentPosition.start),
		// 			end: textDocument.positionAt(meta.componentPosition.end)
		// 		},
		// 		message: `Component must include a 'render()' method`,
		// 		source: STENCIL_DIAGNOSTIC_SOURCE,
		// 		code: STENCIL_ERROR.MISSING_RENDER,
		// 	};
		// 	diagnostics.push(diagnostic);
		// }

		// if (meta.render && !meta.render.returnsJSX && diagnostics.every(diagnosticExists(STENCIL_ERROR.RENDER_RETURN_JSX))) {
		// 	let diagnostic: Diagnostic = {
		// 		severity: DiagnosticSeverity.Error,
		// 		range: {
		// 			start: textDocument.positionAt(meta.render.start),
		// 			end: textDocument.positionAt(meta.render.end)
		// 		},
		// 		message: `'render()' must return JSX.Element | JSX.Element[]`,
		// 		source: STENCIL_DIAGNOSTIC_SOURCE,
		// 		code: STENCIL_ERROR.RENDER_RETURN_JSX
		// 	};
		// 	diagnostics.push(diagnostic);
		// }
	}
	
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

function hasEnding(input: string) {
	return (str: string) => input.endsWith(str);
}
interface PathCompletionOptions {
	relativeTo?: string;
	pattern?: string | string[];
	includeDirs?: boolean;
	includeFiles?: boolean;
}
function providePathCompletions(textDocument: TextDocumentIdentifier, opts: PathCompletionOptions = {}): CompletionItem[] {
	opts = Object.assign({}, { relativeTo: '', pattern: '*', includeDirs: true, includeFiles: true }, opts);

	const createFile = (p: string) => ({ label: p, kind: CompletionItemKind.File, sortText: `zzz-${p}` });
	const createFolder = (p: string) => ({ label: p, kind: CompletionItemKind.Folder, sortText: `aaa-${p}` });

	
	const completions: CompletionItem[] = [];
	const pathToDir = path.join(path.dirname(uri2path(textDocument.uri)), opts.relativeTo).replace('\%40', '@');
	const files = fs.readdirSync(pathToDir, { encoding: 'utf8' });
	if (opts.includeFiles) { completions.push(...multimatch(files, opts.pattern).map(createFile)); }
	if (opts.includeDirs) { completions.push(...files.filter(p => fs.statSync(path.join(pathToDir, p)).isDirectory()).map(createFolder)) }
	return completions;
}

// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {

	const completions = [];

	// The pass parameter contains the position of the text document in
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.
	const document = documents.get(_textDocumentPosition.textDocument.uri);
	const sourceFile = createSourceFile(_textDocumentPosition.textDocument.uri, document.getText(), ScriptTarget.ES2017);
	const position = getPositionOfLineAndCharacter(sourceFile, _textDocumentPosition.position.line, _textDocumentPosition.position.character);

	const documentMeta = getDocumentMeta(document.uri);
	const containingNode = getNodeContainingPosition(sourceFile, position);
	if (containingNode) {
		switch (containingNode.kind) {
			case ts.SyntaxKind.StringLiteral:
			case ts.SyntaxKind.ObjectLiteralExpression:
				if (ts.isCallExpression(containingNode.parent) && ts.isDecorator(containingNode.parent.parent)) {
					const decoratorName = ts.isIdentifier(containingNode.parent.expression) && containingNode.parent.expression.text;
					switch (decoratorName) {
						case 'Prop':

							completions.push(...[
								...['attr', 'context', 'connect'].map(label => (
									{
										label,
										kind: CompletionItemKind.Field,
										insertText: `${label}: '$0'`,
										insertTextFormat: InsertTextFormat.Snippet
									}
								)),
								...['mutable', 'reflectToAttr'].map(label => (
									{
										label,
										kind: CompletionItemKind.Field,
										insertText: label + ': ${1|true,false|}',
										insertTextFormat: InsertTextFormat.Snippet
									}
								))
							])
							break;
						case 'Watch':
							const props = [...documentMeta.properties, ...documentMeta.stateNames].filter(x => !documentMeta.watchedNames.includes(x));
							completions.push(...props.map(label => (
								{
									label,
									kind: CompletionItemKind.Field,
									insertText: label,
									insertTextFormat: InsertTextFormat.PlainText
								}
							))
							);
					}
					// connection.console.log(`Inside a ${decoratorName} decorator`);
				} else if (ts.isStringLiteral(containingNode)) {
					if (containingNode.parent && ts.isArrayLiteralExpression(containingNode.parent)) {
						if (containingNode.parent.parent && ts.isPropertyAssignment(containingNode.parent.parent) && ts.isIdentifier(containingNode.parent.parent.name)) {
							const propertyName = containingNode.parent.parent.name.text;
							const existing = containingNode.parent.elements.map(el => el && ts.isStringLiteral(el) && el.text);
							let files: CompletionItem[];
							
							// connection.console.log(`PropertyName: ${propertyName}`);
							switch (propertyName) {
								case 'assetsDirs':
									files = providePathCompletions(document, {
										relativeTo: containingNode.text,
										includeFiles: false
									});
									completions.push(...files.filter(x => !existing.includes(x.label)))
									break;
								case 'styleUrls':
									files = providePathCompletions(document, {
										relativeTo: containingNode.text,
										pattern: ['**/*.css', '**/*.s{c,a}ss', '**/*.styl{us,}', '**/*.pcss', '!**/*.vars.*']
									});
									completions.push(...files.filter(x => !existing.includes(x.label)))
									break;
								default:
									if (ts.isObjectLiteralExpression(containingNode.parent.parent.parent) && ts.isPropertyAssignment(containingNode.parent.parent.parent.parent) && ts.isIdentifier(containingNode.parent.parent.parent.parent.name) && containingNode.parent.parent.parent.parent.name.text === 'styleUrls') {
										files = providePathCompletions(document, {
											relativeTo: containingNode.text,
											pattern: ['**/*.css', '**/*.s{c,a}ss', '**/*.styl{us,}', '**/*.pcss', '!**/*.vars.*']
										});
										completions.push(...files.filter(x => !existing.includes(x.label)))
									}
									break;
							}
						}
					}
					if (containingNode.parent && ts.isPropertyAssignment(containingNode.parent) && ts.isIdentifier(containingNode.parent.name)) {
						const propertyName = containingNode.parent.name.text;
						let files: CompletionItem[];
						switch (propertyName) {
							case 'assetsDir':
								files = providePathCompletions(document, {
									relativeTo: containingNode.text,
									includeFiles: false
								});
								completions.push(...files);
								break;
							case 'styleUrl':
								files = providePathCompletions(document, {
									relativeTo: containingNode.text,
									pattern: ['**/*.css', '**/*.s{c,a}ss', '**/*.styl{us,}', '**/*.pcss', '!**/*.vars.*']
								});
								completions.push(...files);
								break;
							default:
								if (ts.isObjectLiteralExpression(containingNode.parent.parent) && ts.isPropertyAssignment(containingNode.parent.parent.parent) && ts.isIdentifier(containingNode.parent.parent.parent.name)) {
									if (containingNode.parent.parent.parent.name.text === 'styleUrls') {
										files = providePathCompletions(document, {
											relativeTo: containingNode.text,
											pattern: ['**/*.css', '**/*.s{c,a}ss', '**/*.styl{us,}', '**/*.pcss', '!**/*.vars.*']
										});
										completions.push(...files);
									}
								}
								break;
						}
					}
				}
				break;
			case ts.SyntaxKind.Block:
				if (ts.isMethodDeclaration(containingNode.parent)) {
					const methodName = ts.isIdentifier(containingNode.parent.name) && containingNode.parent.name.text;
					connection.console.log(`Inside the ${methodName} method`);
				}
				break;
			case ts.SyntaxKind.ClassDeclaration:
				completions.push(...ComponentCompletions(_textDocumentPosition.textDocument, documentMeta));
				break;
		}
	}

	return completions;
});

function isDecorator(id: number) {
	return id >= 100 && id < 200;
}
function isLifecycleMethod(id: number) {
	return id >= 200 && id < 300;
}
function isMethod(id: number) {
	return id >= 300 && id < 400;
}

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	// connection.console.log(`On Completion Resolve: ${JSON.stringify(item, null, 2)}`)
	if (!(item.data && item.data.id && item.data.textDocument)) return null;
	const { id, textDocument } = item.data as { id: number, textDocument: TextDocumentIdentifier };

	if (id && textDocument) {
		const result = [...LIFECYCLE_METHODS, ...DECORATORS, ...METHODS].filter(completion => completion.id === id);
		const completion = result.pop();
		
		if (completion) {
			item.insertText = flatten(completion.body);
			item.insertTextFormat = InsertTextFormat.Snippet;
			
			if (isLifecycleMethod(id)) {
				item.detail = `Stencil: Component Lifecycle Method\n${completion.label}`;
				item.documentation = {
					kind: MarkupKind.Markdown,
					value: flatten(completion.description)
				}
			} else if (isMethod(id)) {
				item.detail = `Stencil: Component Method\n${completion.label}`;
				item.documentation = {
					kind: MarkupKind.Markdown,
					value: flatten(completion.description)
				}
				item.documentation.value += flatten([
					'\n',
					'```ts',
					flatten(completion.preview),
					'```'
				])
				switch (completion.label) {
					case 'render':
						const meta = getDocumentMeta(textDocument.uri);
						item.insertText = item.insertText.replace('{{componentTag}}', `${meta.componentMeta.tag}`);
						break;
				}
			} else if (isDecorator(id)) {
				item.detail = `Stencil: @${completion.label}() Decorator\nAuto import from '@stencil/core'`;
				item.documentation = {
					kind: MarkupKind.Markdown,
					value: flatten(completion.description)
				}
				item.documentation.value += flatten([
					'\n',
					'```ts',
					flatten(completion.preview),
					'```'
				]);
				const { autoImport, properties, stateNames, watchedNames } = getDocumentMeta(textDocument.uri);
				item.additionalTextEdits = getAutoImportEdit(autoImport, completion.autoImport);

				switch (completion.label) {
					case 'Watch':
						const computedProps = [...properties, ...stateNames].filter(x => !watchedNames.includes(x));
						if (computedProps.length > 1) {
							item.insertText = item.insertText.replace('{{computedProps}}', `|${computedProps.join(',')}|`);
						} else if (computedProps.length === 1) {
							item.insertText = item.insertText.replace('{{computedProps}}', `:${computedProps[0]}`);
						} else {
							item.insertText = item.insertText.replace('{{computedProps}}', `:propName`);
						}
						break;
				}
				// connection.console.log(`Additional Text Edits: ${JSON.stringify({ autoImport })}`);
				// connection.console.log(`Additional Text Edits: ${JSON.stringify(item.additionalTextEdits)}`);
			}
		}

		return item;
	} else {
		return undefined;
	}
});

const documentLinksCache = new Map<string, DocumentLink>();

function createDocumentLinkAtNode(sourceFile: ts.SourceFile, node: ts.Node): DocumentLink[] {
	let links: DocumentLink[] = [];
	if (ts.isStringLiteral(node)) {
		const range = Range.create(ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile) + 1), ts.getLineAndCharacterOfPosition(sourceFile, node.getEnd() - 1))
		const link = (node as any).text.trim();
		if (link) {
			links.push(DocumentLink.create(range, path.join(path.dirname(sourceFile.fileName), link)));
		}
	} else if (ts.isArrayLiteralExpression(node)) {
		node.elements.map((value) => createDocumentLinkAtNode(sourceFile, value)).forEach(x => links.push(...x));
	} else if (ts.isObjectLiteralExpression(node)) {
		node.properties.map((prop) => ts.isPropertyAssignment(prop) && createDocumentLinkAtNode(sourceFile, prop.initializer)).forEach(x => links.push(...x));
	}

	return links;
}

function findDocumentLinks(sourceFile: ts.SourceFile): DocumentLink[] {
	const links: any[] = [];
	let found = false;
	
	let parent: ts.Node;
	function visit(node: ts.Node) {
		node.parent = parent;
		parent = node;

		if (isComponentDecorator(node) && !found) {
			found = true;
			const opts = getComponentDecoratorOptions(node);
			opts.properties.forEach(prop => {
				if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
					switch (prop.name.text) {
						case 'styleUrl':
						case 'styleUrls':
						case 'assetsDir':
						case 'assetsDirs':
							links.push(...createDocumentLinkAtNode(sourceFile, prop.initializer));
							break;
						default: break;
					}
				}
			})
		}

		if (!found) {
			node.forEachChild(visit);
		}
	}

	visit(sourceFile);
	return links.filter(x => x);
}

connection.onDocumentLinks((params) => {
	const document = documents.get(params.textDocument.uri);
	const sourceFile = ts.createSourceFile(document.uri, document.getText(), ts.ScriptTarget.ES2017);
	return findDocumentLinks(sourceFile);
});

connection.onDocumentLinkResolve((params): DocumentLink => {
	connection.console.log(`Document Link: ${JSON.stringify(params, null, 2)}`);
	return null;
})

connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
// connection.onDidCloseTextDocument((params) => {
// 	// A text document got closed in VSCode.
// 	// params.uri uniquely identifies the document.
// 	connection.console.log(`${params.textDocument.uri} closed.`);
// });
connection.onDidChangeTextDocument((params) => {
	connection.console.log(`${params.textDocument.uri} changed.`);
	getDocumentMeta(params.textDocument.uri);
})

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
