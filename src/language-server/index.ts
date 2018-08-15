import {
	Connection, createConnection, ProposedFeatures,
	InitializeParams, InitializeResult, InitializeError, TextDocumentSyncKind, TextDocument, DidChangeConfigurationNotification, DidChangeTextDocumentNotification, CompletionParams, InitializedParams,
	CompletionItem,
	TextDocumentIdentifier,
	DocumentLinkParams
} from 'vscode-languageserver';

import { CAPABILITY } from './capabilities';

import { ProjectManager } from '../project-manager';
import { StencilService } from '../stencil-service';

export class StencilLanguageServer {
	
	/** 
	 * Represents the server connection to the client
	 */
	connection: Connection;
	/** 
	 * Manages textDocuments and configurations, including caching and versioning
	 */
	projectManager: ProjectManager;
	/** 
	 * Handles Stencil-related operations such as completions, diagnostics, etc
	 */
	service: StencilService;

	constructor() {
		this.connection = createConnection(ProposedFeatures.all);
		
		this.projectManager = new ProjectManager();
		this.service = this.projectManager.getStencilService();

		this.bindHandlers();
		this.listen();
	}
	
	/**
	 * Bind each of the LanguageServer's handlers to the corresponding connection handler
	 */
	private bindHandlers(): void {
		this.connection.onInitialize(handler => this.onInitialize(handler));
		this.connection.onInitialized(handler => this.onInitialized(handler));
		this.connection.onCompletion(handler => this.onCompletion(handler));
		this.connection.onDocumentLinks(handler => this.onDocumentLinks(handler));
	}

	/** 
	 * Kicks off listen processes for dependencies that require it
	 */
	private listen() {
		this.projectManager.listen(this.connection);
		this.connection.listen();
	}

	// ------–------–------–------ INITIALIZATION ------–------–------–------
	/** 
	 * Stores client capabilities on initialization
	 */
	private capabilities = new Map<CAPABILITY, boolean>();
	/** 
	 * Checks whether capability exists and is supported
	 */
	private hasCapability(capability: CAPABILITY): boolean {
		return this.capabilities.has(capability) && this.capabilities.get(capability);
	}

	onInitialize({ capabilities }: InitializeParams): InitializeResult {
		this.capabilities.set(CAPABILITY.CONFIGURATION, capabilities.workspace && !!capabilities.workspace.configuration);
		this.capabilities.set(CAPABILITY.WORKSPACE_FOLDER, capabilities.workspace && !!capabilities.workspace.workspaceFolders);
		this.capabilities.set(CAPABILITY.DIAGNOSTIC_RELATED_INFORMATION, capabilities.textDocument && capabilities.textDocument.publishDiagnostics && capabilities.textDocument.publishDiagnostics.relatedInformation);
		this.capabilities.set(CAPABILITY.DOCUMENT_LINKS, capabilities.textDocument && capabilities.textDocument.documentLink && capabilities.textDocument.documentLink.dynamicRegistration);

		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				completionProvider: {
					resolveProvider: true
				},
				documentLinkProvider: {
					resolveProvider: true
				}
			}
		}
	};

	onInitialized(_: InitializedParams): void {
		if (this.hasCapability(CAPABILITY.CONFIGURATION)) {
			this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
		}
		
		if (this.hasCapability(CAPABILITY.WORKSPACE_FOLDER)) {
			this.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
				// connection.console.log('Workspace folder change event received.');
			})
		}

		this.connection.console.log('Stencil Language Server Initialized');
	}

	onCompletion({ position, textDocument }: CompletionParams) {
		return this.service.getCompletionItems(textDocument, position);
	}

	onCompletionResolve(item: CompletionItem): CompletionItem {
		return this.service.resolveCompletionItem(item);
	}

	onDocumentLinks({ textDocument }: DocumentLinkParams) {
		if (this.hasCapability(CAPABILITY.DOCUMENT_LINKS)) {
			return this.service.getDocumentLinks(textDocument);
		}
	}

	onDocumentChange(textDocument: TextDocumentIdentifier) {
		const diagnostics = this.service.getDiagnostics(textDocument);
		this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	}

}