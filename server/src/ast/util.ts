import * as ts from 'typescript';

export function evalText(text: string) {
    const fnStr = `return ${text};`;
    return new Function(fnStr)();
}

export interface GetDeclarationParameters {
    <T>(decorator: ts.Decorator, sourceFile: ts.SourceFile): [T];
    <T, T1>(decorator: ts.Decorator, sourceFile: ts.SourceFile): [T, T1];
    <T, T1, T2>(decorator: ts.Decorator, sourceFile: ts.SourceFile): [T, T1, T2];
}
export const getDeclarationParameters: GetDeclarationParameters = (decorator: ts.Decorator, sourceFile: ts.SourceFile): any => {
    if (!ts.isCallExpression(decorator.expression)) {
        return [];
    }

    return decorator.expression.arguments.map((arg) => {
        return evalText(arg.getText(sourceFile).trim())
    });
};


/**
 * Check if class has component decorator
 * @param classNode
 */
export function isComponentClass(classNode: ts.ClassDeclaration) {
    if (!Array.isArray(classNode.decorators)) {
        return false;
    }
    const componentDecoratorIndex = classNode.decorators.findIndex(dec =>
        (ts.isCallExpression(dec.expression) && ts.isIdentifier(dec.expression.expression) && dec.expression.expression.text === 'Component')
    );
    return (componentDecoratorIndex !== -1);
}

export function isDecoratorNamed(name: string) {
    return (dec: ts.Decorator): boolean => {
        return (ts.isCallExpression(dec.expression) && ts.isIdentifier(dec.expression.expression) && dec.expression.expression.text === name);
    };
}

export function getDecoratorArguments(dec: ts.Decorator) {
    return ts.isCallExpression(dec.expression) ? dec.expression.arguments : null;
}

export function isPropertyWithDecorators(member: ts.ClassElement): boolean {
    return ts.isPropertyDeclaration(member)
        && Array.isArray(member.decorators)
        && member.decorators.length > 0;
}

export function isMethod(member: ts.ClassElement, methodName: string) {
    if (ts.isMethodDeclaration(member)) {
        return member.getFirstToken().getText() === methodName;
    }
    return false;
}

export function isMethodWithDecorators(member: ts.ClassElement): boolean {
    return ts.isMethodDeclaration(member)
        && Array.isArray(member.decorators)
        && member.decorators.length > 0;
}


/**
 * Check if value has prop decorator
 * @param classNode
 */
export function isProp(value: ts.ClassElement) {
    if (!Array.isArray(value.decorators)) {
        return false;
    }
    const propDecoratorIndex = value.decorators.findIndex(dec =>
        (ts.isCallExpression(dec.expression) && ts.isIdentifier(dec.expression.expression) && dec.expression.expression.text === 'Prop')
    );
    return (propDecoratorIndex !== -1);
}

export function isState(value: ts.ClassElement) {
    if (!Array.isArray(value.decorators)) {
        return false;
    }
    const propDecoratorIndex = value.decorators.findIndex(dec =>
        (ts.isCallExpression(dec.expression) && ts.isIdentifier(dec.expression.expression) && dec.expression.expression.text === 'State')
    );
    return (propDecoratorIndex !== -1);
}