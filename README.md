# exprviewer README

This extension can be used with C/C++ code to better visualize complicated expressions, especially mathematical ones. It will use the current selection in the editor or if there is no selection, it will use the whole line at the cursor location. It works by parsing C/C++ expressions, converting the expression into a TeX representation and then using [MathJax](https://www.mathjax.org/) to convert the TeX into HTML.

## Features

TODO

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Extension Settings

There are currently no special settings provided.
Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Known Issues

It currently doesn't fully handle C-style casts or templates.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of exprviewer

-----------------------------------------------------------------------------------------------------------
