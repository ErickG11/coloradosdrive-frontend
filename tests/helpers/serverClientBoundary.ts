import path from "node:path";
import ts from "typescript";

// Analisis estatico de llamadas locales: sigue imports, alias y reexports.
// No ejecuta los modulos ni confunde el uso JSX de un componente cliente
// con una llamada a una funcion durante el render de servidor.
export function findClientCalls(files: Record<string, string>, root: string) {
  const key = (name: string) => path.resolve(name).replaceAll("\\", "/").toLowerCase();
  const sources = new Map(
    Object.entries(files).map(([name, text]) => [
      key(name),
      ts.createSourceFile(path.resolve(name), text, ts.ScriptTarget.Latest, true),
    ]),
  );
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    noLib: true,
    types: [],
    baseUrl: root,
    paths: { "@/*": ["./*"] },
  };
  const host = ts.createCompilerHost(options);
  const directories = new Set<string>();
  for (const source of sources.values()) {
    let directory = path.dirname(source.fileName);
    while (!directories.has(key(directory))) {
      directories.add(key(directory));
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
  host.getSourceFile = (name) => sources.get(key(name));
  host.readFile = (name) => sources.get(key(name))?.text;
  host.fileExists = (name) => sources.has(key(name));
  host.directoryExists = (name) => directories.has(key(name));
  host.getCurrentDirectory = () => root;
  host.realpath = (name) => name;
  const program = ts.createProgram({
    rootNames: [...sources.values()].map((s) => s.fileName),
    options,
    host,
  });
  const checker = program.getTypeChecker();
  const directives = new Map<ts.SourceFile, boolean>();
  const client = (file: ts.SourceFile) => {
    const cached = directives.get(file);
    if (cached !== undefined) return cached;
    let value = false;
    for (const statement of file.statements) {
      if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
      if (statement.expression.text === "use client") {
        value = true;
        break;
      }
    }
    directives.set(file, value);
    return value;
  };
  const resolutions = new Map<string, ts.SourceFile | undefined>();
  const resolve = (name: string, from: ts.SourceFile) => {
    const cacheKey = `${from.fileName}:${name}`;
    if (resolutions.has(cacheKey)) return resolutions.get(cacheKey);
    const resolved = ts.resolveModuleName(name, from.fileName, options, host).resolvedModule;
    const source = resolved ? sources.get(key(resolved.resolvedFileName)) : undefined;
    resolutions.set(cacheKey, source);
    return source;
  };
  const moduleOf = (node: ts.Node) => {
    let parent: ts.Node | undefined = node;
    while (parent && !ts.isImportDeclaration(parent) && !ts.isExportDeclaration(parent))
      parent = parent.parent;
    return parent &&
      (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) &&
      parent.moduleSpecifier &&
      ts.isStringLiteral(parent.moduleSpecifier)
      ? resolve(parent.moduleSpecifier.text, parent.getSourceFile())
      : undefined;
  };
  const exported = (file: ts.SourceFile, name: string) => {
    const symbol = checker.getSymbolAtLocation(file);
    return symbol
      ? checker.getExportsOfModule(symbol).find((value) => value.name === name)
      : undefined;
  };
  function fromModule(
    file: ts.SourceFile,
    name?: string,
    seen = new Set<string>(),
  ): string | undefined {
    if (client(file)) return file.fileName;
    if (!name || seen.has(`${file.fileName}:${name}`)) return;
    seen.add(`${file.fileName}:${name}`);
    const value = exported(file, name);
    for (const statement of file.statements) {
      if (
        !ts.isExportDeclaration(statement) ||
        statement.exportClause ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue;
      const target = resolve(statement.moduleSpecifier.text, file);
      if (target && value && exported(target, name) === value) {
        const boundary = fromModule(target, name, seen);
        if (boundary) return boundary;
      }
    }
  }
  function fromSymbol(
    symbol: ts.Symbol | undefined,
    seen = new Set<ts.Symbol>(),
  ): string | undefined {
    if (!symbol || seen.has(symbol)) return;
    seen.add(symbol);
    for (const declaration of symbol.declarations ?? []) {
      const file = declaration.getSourceFile();
      if (client(file)) return file.fileName;
      const imported = moduleOf(declaration);
      if (imported) {
        const name =
          ts.isImportSpecifier(declaration) || ts.isExportSpecifier(declaration)
            ? (declaration.propertyName ?? declaration.name).text
            : ts.isImportClause(declaration)
              ? "default"
              : undefined;
        const boundary = fromModule(imported, name);
        if (boundary) return boundary;
      }
      if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
        const boundary = fromExpression(declaration.initializer, seen);
        if (boundary) return boundary;
      }
    }
    return symbol.flags & ts.SymbolFlags.Alias
      ? fromSymbol(checker.getImmediateAliasedSymbol(symbol), seen)
      : undefined;
  }
  function fromExpression(
    expression: ts.Expression,
    seen = new Set<ts.Symbol>(),
  ): string | undefined {
    if (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isNonNullExpression(expression)
    )
      return fromExpression(expression.expression, seen);
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      const base = checker.getSymbolAtLocation(expression.expression);
      const name = ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : expression.argumentExpression && ts.isStringLiteral(expression.argumentExpression)
          ? expression.argumentExpression.text
          : undefined;
      for (const declaration of base?.declarations ?? []) {
        if (!ts.isNamespaceImport(declaration)) continue;
        const target = moduleOf(declaration);
        const boundary = target && fromModule(target, name);
        if (boundary) return boundary;
      }
      return (
        fromSymbol(checker.getSymbolAtLocation(expression), seen) ??
        fromExpression(expression.expression, seen)
      );
    }
    return ts.isIdentifier(expression)
      ? fromSymbol(checker.getSymbolAtLocation(expression), seen)
      : undefined;
  }
  const violations: { file: string; line: number; call: string; clientModule: string }[] = [];
  for (const file of sources.values()) {
    if (client(file)) continue;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const boundary = fromExpression(node.expression);
        if (boundary)
          violations.push({
            file: path.relative(root, file.fileName),
            line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            call: node.expression.getText(file),
            clientModule: path.relative(root, boundary),
          });
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return violations;
}
