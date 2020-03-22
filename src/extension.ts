"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
var nomnoml = require("nomnoml");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    function errorSnippet(error: Error): string {
        const message = error.message.replace(
            /\n/g,
            "<br>&nbsp&nbsp&nbsp&nbsp&nbsp"
        );

        return `<html>
            <body>
                <h1>Error: <span style="font-family: monospace;">${error.name}</span></h1>
                <hr>
                <h2>Message: <span style="font-family: monospace;">${message}</span></h2>
            </body>
        </html>`;
    }

    function generateDiagram(text: string): string {
        let svg: string;
        let backgroundColor: string | undefined = undefined;

        try {
            svg = nomnoml.renderSvg(text);
            let result = /\#bgColor\:\s?(\S*)/.exec(text);
            if (result && result[1]) backgroundColor = result[1];
        } catch (exception) {
            return errorSnippet(exception);
        }

        return `<html><body style="margin: 0px; width: 100%; height: 100%; overflow:hidden;">
            <div style="width: 100%; height: 100%; overflow: scroll;">
            ${svg}
            </div> 
            <script>
                var svg = document.getElementsByTagName( 'svg' )[ 0 ];
                var boundingBox = svg.getBBox( );
                var width = boundingBox.width + 20;
                var height = boundingBox.height + 20;
                svg.style['min-width'] = width + 'px';
                svg.style['min-height'] = height + 'px';
                ${
                    backgroundColor != undefined
                        ? `svg.style['background-color'] = '${backgroundColor}';`
                        : "//no background color specified."
                }
            </script>
        </body></html>`;
    }

    function getSplashContent(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nomnoml Preview</title>
        </head>
        <body width="100%" height="100%">
            <p>Nomnoml Preview</p>
        </body>
        </html>`;
    }

    function createPreviewPanel(
        context: vscode.ExtensionContext
    ): vscode.WebviewPanel {
        return vscode.window.createWebviewPanel(
            "extension",
            "Nomnoml Preview",
            vscode.ViewColumn.Two,
            {}
        );
    }

    function updatePewviewContent(
        panel: vscode.WebviewPanel | undefined,
        document: vscode.TextDocument | undefined
    ): void {
        if (
            panel &&
            document &&
            document === vscode.window.activeTextEditor?.document
        ) {
            panel.webview.html = generateDiagram(document.getText());
        }
    }

    class WebviewPanelObservable {
        constructor(
            context: vscode.ExtensionContext,
            public current: vscode.WebviewPanel | undefined = undefined
        ) {
            this.current = current;
            current?.onDidDispose(
                () => (this.current = undefined),
                null,
                context.subscriptions
            );
        }
    }

    let panelObservable = new WebviewPanelObservable(context);

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(
        vscode.commands.registerCommand("extension.nomnoml", () => {
            // The code you place here will be executed every time your command is executed
            let panel = panelObservable.current;
            if (panel) {
                panel.reveal();
            } else {
                panel = createPreviewPanel(context);
                panelObservable = new WebviewPanelObservable(context, panel);
            }

            const editor = vscode.window.activeTextEditor;
            if (editor?.document.languageId == "nomnoml") {
                panel.webview.html = generateDiagram(editor.document.getText());
            } else {
                panel.webview.html = getSplashContent();
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e =>
            updatePewviewContent(panelObservable.current, e.document)
        )
    );

    context.subscriptions.push({
        dispose: () => panelObservable.current?.dispose()
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
