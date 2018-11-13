import { TextDocument, Position, Range } from 'vscode-languageserver';
import * as ts from 'typescript';

interface TextLine {
    line: number;
    text: string;
}

export function isStencilImport(text: string) {
    const PATTERN = /from (['"])@stencil\/core\1;?\s*$/g;
    return PATTERN.test(text);
}

function getStencilImportNode(sourceFile: ts.SourceFile): any {
    let stencilImportClause: any;

    function visit(node: ts.Node) {
        if (!stencilImportClause) {
            if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === '@stencil/core') {
                if (!(node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings))) return;
                let imports;
                const start = ts.getLineAndCharacterOfPosition(sourceFile, node.importClause.pos + 1);
                const end = ts.getLineAndCharacterOfPosition(sourceFile, node.importClause.end);
                const range: Range = Range.create(start, end);
                const multiline = (start.line !== end.line);
                // ts.LanguageService.getIndentationAtPosition(start);
                // const indent = 
                
                imports = node.importClause.namedBindings.elements;
                imports = imports.map(el => {
                    if (el.propertyName && ts.isIdentifier(el.propertyName)) {
                        return `${el.propertyName.text} as ${el.name.text}`;
                    } else {
                        return `${el.name.text}`;
                    }
                });
                stencilImportClause = { range, multiline, imports };
            }
        }

        node.forEachChild(visit);
    }

    visit(sourceFile);
    return stencilImportClause;
}

export function getAutoImport(document: TextDocument): any {
    const sourceFile = ts.createSourceFile(document.uri, document.getText(), ts.ScriptTarget.ES2017);
    return getStencilImportNode(sourceFile);

    // { range: Range, text: string }
    // const line = getStencilImportLine(document);
    // const start = Position.create(line.line, line.text.indexOf('{') + 1);
    // const end = Position.create(line.line, line.text.indexOf('}'));
    // return { range: Range.create(start, end), text: line.text };
}

function getStencilImportLine(document: TextDocument): TextLine {
    let line: number;
    let text: string;
    const lines = document.getText().split(/\n/g);
    for (let i = 0; i < document.lineCount + 1 && line === undefined; i++) {
        if (isStencilImport(lines[i])) {
            line = i;
            text = lines[i];
        }
    }
    return { line, text };
}

export function getStencilImportList(lineText: string): string[] | null {
    const imports = /\{(.*)\}/g;
    const match = imports.exec(lineText);
    if (match) {
        return match[1].split(',').map(text => text.trim()).filter(text => text);
    } else {
        return null;
    }
}

export function alphabetize(arr: string[]) {
    const alphabetized = arr.map((value, index) => {
        return { index, value: value.toLowerCase() }
    }).sort((a, b) => {
        if (a.value > b.value) { return 1; }
        if (a.value < b.value) { return -1; }
        return 0;
    });

    return alphabetized.map((el) => arr[el.index]);
}