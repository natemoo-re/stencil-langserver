import { Connection } from 'vscode-languageserver';

export class Logger {
	constructor(private connection: Connection) { }
}