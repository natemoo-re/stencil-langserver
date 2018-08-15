import * as ts from "typescript";
import { IConnection, TextDocuments, TextDocumentIdentifier } from 'vscode-languageserver';
import { StencilService } from "./stencil-service";

interface DocmentMetadata {
	componentOptions: { [key: string]: any };
	componentMembers: string[];
	methods: string[];
	props: string[];
	states: string[];
	watched: string[];
}

export class ProjectManager {
	
	private documents: TextDocuments;
	public getDocument(textDocument: TextDocumentIdentifier) {
		return this.documents.get(textDocument.uri);
	}

	constructor() {
		this.documents = new TextDocuments();
		this.service = new StencilService(this);
	}

	private service: StencilService;
	public getStencilService() {
		return this.service;
	}


	public getSourceFile(textDocument: TextDocumentIdentifier): ts.SourceFile {
		return;
	}

	public getMetadata(textDocument: TextDocumentIdentifier): DocmentMetadata {
		return;
	}

	/** 
	 * Listens to low-level notifications from the connection
	*/
	listen(connection: IConnection): void {
		this.documents.listen(connection);
	}
}