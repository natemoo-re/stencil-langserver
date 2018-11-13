import { TextDocument, Range } from 'vscode-languageserver';
import * as ts from 'typescript';
import { isComponentClass, isProp, isState, isDecoratorNamed, getDecoratorArguments, getDeclarationParameters } from './util';

interface ASTResults {
    componentMeta: any;
    tag: string;
    referencedDocuments: { start: number, end: number, referenceUri: string }[];
    componentPosition: { start: number, end: number };
    componentRange: Range;
    insideClass: { start: number, end: number };
    insideClassMethod: { start: number, end: number }[];
    members: ts.Node[];
    properties: string[];
    stateNames: string[];
    methodNames: string[];
    watchedNames: any[];
    test: any[];
    render: { start: number, end: number, returnsJSX: boolean };
}

export function getComponentDecoratorMeta(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): any{
    if (!node.decorators) {
        return undefined;
    }

    const componentDecorator = node.decorators.find(isDecoratorNamed('Component'));
    if (!componentDecorator) {
        return undefined;
    }

    const [componentOptions] = getDeclarationParameters<any>(componentDecorator, sourceFile);
    return componentOptions;
}

function returnsJSXElement(returnStatement: ts.ReturnStatement) {
    let returnsJSXElement = false;
    function checkForJSXElement(node: ts.Node) {
        if (!returnsJSXElement) {
            returnsJSXElement = /jsx/g.test(ts.SyntaxKind[node.kind].toLowerCase());
            node.forEachChild(checkForJSXElement);
        }
    }
    
    returnStatement.forEachChild(checkForJSXElement);
    return returnsJSXElement;
}

export function walkAST(document: TextDocument): ASTResults {
    const sourceFile = ts.createSourceFile(document.uri, document.getText(), ts.ScriptTarget.ES2017);
    let processed = false;
    let ast;

    function visit(node: ts.Node) {
        if (!processed) {
            if (ts.isClassDeclaration(node)) {
                if (isComponentClass(node)) {
                    const componentPosition = { start: node.pos, end: node.end };
                    const componentRange = { start: ts.getLineAndCharacterOfPosition(sourceFile, node.pos), end: ts.getLineAndCharacterOfPosition(sourceFile, node.end) };
                    processed = true;
                    
                    let componentMeta = getComponentDecoratorMeta(node, sourceFile);
                    let tag = componentMeta.tag;
                    let referencedDocuments: any[] = [];
                    

                    // const decorated = node.members
                    //     .filter(member => Array.isArray(member.decorators) && member.decorators.length > 0);

                    // const properties = decorated
                    //     .filter((prop: ts.PropertyDeclaration) => {
                    //         const propDecorator = prop.decorators.find(isDecoratorNamed('Prop'));
                    //         return (propDecorator !== null);
                    //     })
                    //     .map(classElement => (classElement.name as any).text);
                    // const stateNames = decorated
                    //     .filter((prop: ts.PropertyDeclaration) => prop.decorators.find(isDecoratorNamed('Prop')))
                    
                    let insideClass = { start: (node.name as any).end, end: node.end };
                    let insideClassMethod: { start: number, end: number }[] = [];
                    let properties: string[] = [];
                    let stateNames: string[] = [];
                    let methodNames: string[] = [];
                    let watchedNames: any[] = [
                        ...node.members
                            .filter(member => Array.isArray(member.decorators) && member.decorators.length > 0)
                            .filter((method: ts.MethodDeclaration) => method.decorators.find(isDecoratorNamed('Watch')))
                            .map((method: ts.MethodDeclaration) => method.decorators.find(isDecoratorNamed('Watch')))
                            .map((dec) => getDecoratorArguments(dec))
                            .map(args => {
                                if (args) {
                                    const firstArg = args[0];
                                    return (ts.isStringLiteral(firstArg)) ? firstArg.text : null;
                                }
                                return null;
                            })
                    ];
                    let members: any[] = [];
                    let test: any[] = [];
                    let render: { start: number, end: number, returnsJSX: boolean };

                    node.members.forEach((classElement) => {
                        if (Array.isArray(classElement.decorators) && classElement.decorators.length > 0) {
                            classElement.decorators.forEach(decorator => {
                                insideClassMethod.push({ start: decorator.expression.pos, end: decorator.expression.end });
                            })
                        }
                        if (isProp(classElement)) {
                            properties.push((classElement.name as any).escapedText);
                        } else if (isState(classElement)) {
                            stateNames.push((classElement.name as any).escapedText);
                        } else if (ts.isMethodDeclaration(classElement)) {
                            methodNames.push((classElement.name as any).escapedText);
                            if ((classElement.name as any).escapedText === 'render') {
                                const returnStatement = classElement.body && classElement.body.statements.filter(statement => statement.kind === ts.SyntaxKind.ReturnStatement).pop();
                                let returnsJSX = false;
                                if (returnStatement) {
                                    returnsJSX = returnsJSXElement(returnStatement as ts.ReturnStatement);
                                }
                                render = { start: classElement.getStart(sourceFile), end: classElement.getEnd(), returnsJSX };
                            }
                            const body = classElement.body;
                            if (body && body.statements && Array.isArray(body.statements) && body.statements[0]) {
                                insideClassMethod.push({ start: body.statements[0].pos, end: body.statements[0].end });
                            }
                            sourceFile
                        }
                    });
                    ast = {
                        componentPosition,
                        componentRange,
                        componentMeta,
                        tag,
                        referencedDocuments,
                        properties,
                        render,
                        members,
                        insideClass,
                        insideClassMethod,
                        stateNames,
                        methodNames,
                        watchedNames,
                        test,
                    }
                    return;
                }
            }
        }

        node.forEachChild(visit);
    }
    
    visit(sourceFile);

    if (processed) {
        return ast;
    } else {
        return undefined;
    }
}