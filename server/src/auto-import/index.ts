import { alphabetize } from './util';
import { TextEdit, Range } from 'vscode-languageserver';

export default function getAutoImportEdit(autoImport: { range: Range, multiline: boolean, imports: string[] }, insertText: string): TextEdit[] {
    const edits = [];
    const { imports, multiline } = autoImport;
    const sep = multiline ? '\n' : ' ';
    const indent = multiline ? '\t' : '';

    if (imports.length && !imports.includes(insertText)) {
        imports.push(insertText);
        const edit = TextEdit.replace(autoImport.range, `{${sep}${indent}${alphabetize(imports).join(`,${sep}${indent}`)}${sep}}`);
        edits.push(edit);
    }
    return edits;
}