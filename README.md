# exprviewer README

This extension can be used with C/C++ code to better visualize complicated expressions, especially mathematical ones. It will use the current selection in the editor or if there is no selection, it will use the whole line at the cursor location.

It may also work to some degree with other languages that use an expression syntax similar to C/C++.

## Features

The extension attempts to parse the selected text (or current line) with a simple syntax-based parser. It converts the parse expression(s) into Latex, which is then displayed in a separate pane. The conversion to Latex includes recognizing the names of greek letters and some functions (such as sqrt and pow) and converts these to a mathematical form and layout.

There are two commands: "View as Math" and "View as Math (Debug)". The second one will show the text that was parsed, the Latex that it was converted to, and the actual visualization of the Latex.

## Extension Settings

There are currently no special settings provided.

## Known Issues

Because the parse is a simple syntax only parse, there are many things that aren't properly handled. No attempt is made to handle templates and some other constructs (especially those involvng types) are not parsed properly. Also, there is no support for loop constructs or any statements except expressions.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release.

