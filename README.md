# Stencil Language Server

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

This is a language server for [Stencil](https://github.com/ionic-team/stencil) built on the [Language Server Protocol (LSP)](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md).


## Try it out

 - In [Visual Studio Code](https://github.com/natemoo-re/vscode-stencil-tools) 

## Features
 - Context-aware completions
 - Diagnostics
 - Quick Fixes
 - Hovers

## Run it from source

```bash
# install dependencies
npm install

# compile
npm run build
# or compile on file changes
npm run watch

# run over STDIO
node lib/language-server-stdio
# or run over TCP
node lib/language-server

# run tests
npm test
```

## Options

```
  Usage: language-server [options]

  Options:

    -h, --help            output usage information
    -V, --version         output the version number
    -s, --strict          enabled strict mode
    -p, --port [port]     specifies LSP port to use (2089)
    -c, --cluster [num]   number of concurrent cluster workers (defaults to number of CPUs, 8)
    -t, --trace           print all requests and responses
    -l, --logfile [file]  log to this file
    -j, --enable-jaeger   enable OpenTracing through Jaeger
```

## Extensions

This language server implements some LSP extensions, prefixed with an `x`.

- **[Files extension](https://github.com/sourcegraph/language-server-protocol/blob/master/extension-files.md)**
  Allows the server to request file contents without accessing the file system
- **[SymbolDescriptor extension](https://github.com/sourcegraph/language-server-protocol/blob/master/extension-workspace-references.md)**
  Get a SymbolDescriptor for a symbol, search the workspace for symbols or references to it
- **[Streaming](https://github.com/sourcegraph/language-server-protocol/blob/streaming/protocol.md#partialResult)**
  Supports streaming partial results for all endpoints through JSON Patches
- **Packages extension**
  Methods to get information about dependencies
- **TCP / multiple client support**
  When running over TCP, the `exit` notification will not kill the process, but close the TCP socket

## Versioning

This project follows [semver](http://semver.org/) for command line arguments and standard LSP methods.
Any change to command line arguments, Node version or protocol breaking changes will result in a major version increase.

