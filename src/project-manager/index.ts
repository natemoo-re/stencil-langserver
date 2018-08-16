import * as ts from "typescript";
import { IConnection, TextDocuments, TextDocumentIdentifier } from 'vscode-languageserver';
import { StencilService } from "../stencil-service";
import { getStencilImport, StencilImport } from '../stencil-service/features/completions/auto-import';

interface DocmentMetadata {
	stencilImport: StencilImport;
	componentOptions: { [key: string]: any };
	componentMembers: string[];
	methods: string[];
	props: string[];
	states: string[];
	watched: string[];
}

export class ProjectManager {

	private ts: ts.Program;
	
	private documents: TextDocuments;
	public getDocument(textDocument: TextDocumentIdentifier) {
		return this.documents.get(textDocument.uri);
	}

	constructor() {
		this.documents = new TextDocuments();
		this.service = new StencilService(this);
		this.ts = ts.createProgram([], {}, {})

	}

	private service: StencilService;
	public getStencilService() {
		return this.service;
	}


	public getSourceFile(textDocument: TextDocumentIdentifier): ts.SourceFile {
		return;
	}

	public getMetadata(textDocument: TextDocumentIdentifier): DocmentMetadata {
		// getStencilImport()
		return;
	}

	/** 
	 * Listens to low-level notifications from the connection
	*/
	listen(connection: IConnection): void {
		this.documents.listen(connection);
	}
}
