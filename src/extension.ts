'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ADDRGETNETWORKPARAMS } from 'dns';

const eofchar: string = '\0';
const code_0: number = '0'.charCodeAt(0);
const code_7: number = '7'.charCodeAt(0);
const code_9: number = '9'.charCodeAt(0);
const code_a: number = 'a'.charCodeAt(0);
const code_f: number = 'f'.charCodeAt(0);
const code_A: number = 'A'.charCodeAt(0);
const code_F: number = 'F'.charCodeAt(0);

const LF: string = '\n';
const CR: string = '\r';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext)
{
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "exprviewer" is now active!');

    // Track currently webview panel
    let currentPanel: vscode.WebviewPanel | undefined = undefined;        
    let currentPanelDebug: vscode.WebviewPanel | undefined = undefined;        
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.viewExpression', () => {
        // Create and show panel
        if (currentPanel)
            currentPanel.reveal(vscode.ViewColumn.Two, true);
        else
        {
            currentPanel = vscode.window.createWebviewPanel('exprViewer', "Expression Viewer", 
            {
                viewColumn: vscode.ViewColumn.Two, 
                preserveFocus: true
            },
            {
                // Enable scripts in the webview
                enableScripts: true
            });
        }

        // Reset when the current panel is closed
        currentPanel.onDidDispose(() => {
            currentPanel = undefined;
        }, null, context.subscriptions);

        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return; // No open text editor

        let selection = editor.selection;
        var text: string = "";
        if (selection.isEmpty)
        {
            var line = selection.anchor.line;
            text = editor.document.lineAt(line).text;
        }
        else
            text = editor.document.getText(selection);
        // And set its HTML content
        var output = parseExpressions(text);
        currentPanel.webview.html = getWebviewContent(output);
    });

    context.subscriptions.push(disposable);

    let disposable2 = vscode.commands.registerCommand('extension.viewExpressionDebug', () => {
        // Create and show panel
        if (currentPanelDebug)
            currentPanelDebug.reveal(vscode.ViewColumn.Two, true);
        else
        {
            currentPanelDebug = vscode.window.createWebviewPanel('exprViewer', "Expression Viewer (Debug)", 
            {
                viewColumn: vscode.ViewColumn.Two, 
                preserveFocus: true
            },
            {
                // Enable scripts in the webview
                enableScripts: true
            });
        }

        // Reset when the current panel is closed
        currentPanelDebug.onDidDispose(() => {
            currentPanelDebug = undefined;
        }, null, context.subscriptions);

        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return; // No open text editor

        let selection = editor.selection;
        var text: string = "";
        if (selection.isEmpty)
        {
            var line = selection.anchor.line;
            text = editor.document.lineAt(line).text;
        }
        else
            text = editor.document.getText(selection);
        // And set its HTML content
        var output = parseExpressions(text);
        currentPanelDebug.webview.html = getWebviewContentDebug(text, output, output);
    });

    context.subscriptions.push(disposable2);
}

enum errors
{
    UNEXPECTED_EOF,
    UNKNOWN_DIRECTIVE,
    SYNTAX_ERROR,
    BAD_SUFFIX_ON_NUMBER,
    CONSTANT_TOO_BIG,
    UNSUPPORTED_ESACAPE_CHAR,
    EMPTY_CHAR_CONSTANT,
    INTERNAL_COMPILER_TOKENTABLE_ERROR,
    TOO_MANY_CHARS_IN_CONSTANT,
    UNEXPECTED_TOKEN_EX,
    EXPECTED_IDENTIFIER,
    INTERNAL_COMPILER_STATE_ERROR,
};

// Tokenizer
enum token
{
	O = 0, // Used in some of the token tables/structures.
// Complex tokens
	tok_integer,
	tok_real,
	tok_multicomment,
	tok_singlecomment,
	tok_ident,
	tok_stringliteral,	// "hello"
	tok_charliteral,	// 'a'

// Punctuation tokens
	tok_lparen,		// (
	tok_rparen,		// )
	tok_comma,		// ,
	tok_semicolon,	// ;
	tok_lbrace,		// {
	tok_rbrace,		// }
	tok_lbracket,	// [
	tok_rbracket,	// ]

	tok_plus,		// +
	tok_plusplus,	// ++
	tok_plusequal,	// +=
	tok_minus,		// -
	tok_minusminus,	// --
	tok_minusequal,	// -=
	tok_times,		// *
	tok_timesequal,	// *=
	tok_div,		// /
	tok_divequal,	// /=
	tok_equal,		// =
	tok_equalequal, // ==
	tok_mod,		// %
	tok_modequal,	// %=
	tok_logicalnot,	// !
	tok_notequal,	// !=
	tok_bitxor,		// ^
	tok_bitxorequal,// ^=
	tok_bitand,		// &
	tok_bitandequal,// &=
	tok_bitor,		// |
	tok_bitorequal,	// |=
	tok_lt,			// <
	tok_ltequal,	// <=
	tok_gt,			// >
	tok_gtequal,	// >=
	tok_ternary,	// ?
	tok_colon,		// :
	tok_logicaland,	// &&
	tok_logicalor,	// ||
	tok_compl,		// ~
	tok_dot,		// .
	tok_arrow,		// ->
	tok_scoperes,	// ::
	tok_at,			// @
	tok_doubledot,	// .. - not really used, but helps implement tok_ellipsis
	tok_ellipsis,	// ...

// keyword tokens
	tok_alias,
	tok_asm,
	tok_atomic,
	tok_auto,
//	tok_bool,
	tok_break,
	tok_case,
	tok_catch,
	tok_cdecl,
//	tok_char,
	tok_class,
	tok_coclass,
	tok_cofun,
	tok_cointerface,
	tok_winclass,
	tok_wininterface,
	tok_winstruct,
	tok_const,
	tok_const_cast,
	tok_continue,
	tok_ctor,
	tok_default,
	tok_delete,
	tok_do,
	tok_dtor,
//	tok_double,
	tok_dynamic_cast,
	tok_else,
	tok_enum,
	tok_explicit,
	tok_export,
	tok_extern,
	tok_false,
//	tok_float,
	tok_for,
	tok_friend,
	tok_fun,
	tok_goto,
	tok_if,
	tok_import,
	tok_in,
	tok_inline,
	tok_interface,
//	tok_int,
	tok_is,
//	tok_long,
	tok_mutable,
	tok_namespace,
	tok_new,
	tok_nullptr,
	tok_operator,
	tok_partial,
	tok_private,
	tok_prop,
	tok_protected,
	tok_public,
	tok_pure,
	tok_register,
	tok_reinterpret_cast,
	tok_return,
//	tok_short,
//	tok_signed,
	tok_sizeof,
	tok_static,
	tok_static_cast,
	tok_stdcall,
//	tok_string,
	tok_struct,
	tok_switch,
	tok_template,
	tok_this,
	tok_thiscall,
	tok_throw,
	tok_true,
	tok_try,
	tok_typecreate,
	tok_typedef,
	tok_typeid,
	tok_typename,
	tok_union,
//	tok_unsigned,
	tok_using,
	tok_var,
	tok_virtual,
//	tok_void,
	tok_volatile,
//	tok_wchar_t,
	tok_while,
	tok_poundpragma,

// Special tokens
	tok_end,
	tok_error, // Indicates that an error occurred.
};

class keyword_info
{
    keyword: string;
    tok: token;
    constructor(keyword: string, tok: token)
    {
        this.keyword = keyword;
        this.tok = tok;
    }
};

let keywords : Array<keyword_info> =
[
	new keyword_info("#pragma", token.tok_poundpragma),
	new keyword_info("alias", token.tok_alias),
	new keyword_info("and ", token.tok_logicaland),
	new keyword_info("and_eq", token.tok_bitandequal),
	new keyword_info("asm", token.tok_asm),
	new keyword_info("atomic", token.tok_atomic),
	new keyword_info("auto", token.tok_auto),
	new keyword_info("bitand", token.tok_bitand),
	new keyword_info("bitor", token.tok_bitor),
//	new keyword_info("bool", token.tok_bool),
	new keyword_info("break", token.tok_break),
	new keyword_info("case", token.tok_case),
	new keyword_info("catch", token.tok_catch),
	new keyword_info("cdec", token.tok_cdecl),
//	new keyword_info("char", token.tok_char),
	new keyword_info("class", token.tok_class),
	new keyword_info("coclass", token.tok_coclass),
	new keyword_info("cofun", token.tok_cofun),
	new keyword_info("cointerface", token.tok_cointerface),
	new keyword_info("comp", token.tok_compl),
	new keyword_info("const", token.tok_const),
	new keyword_info("const_cast", token.tok_const_cast),
	new keyword_info("continue", token.tok_continue),
	new keyword_info("ctor", token.tok_ctor),
	new keyword_info("default", token.tok_default),
	new keyword_info("delete", token.tok_delete),
	new keyword_info("do", token.tok_do),
	new keyword_info("dtor", token.tok_dtor),
//	new keyword_info("double", token.tok_double),
	new keyword_info("dynamic_cast", token.tok_dynamic_cast),
	new keyword_info("else", token.tok_else),
	new keyword_info("enum", token.tok_enum),
	new keyword_info("explicit", token.tok_explicit),
	new keyword_info("export", token.tok_export),
	new keyword_info("extern", token.tok_extern),
	new keyword_info("false", token.tok_false),
//	new keyword_info("float", token.tok_float),
	new keyword_info("for", token.tok_for),
	new keyword_info("friend", token.tok_friend),
	new keyword_info("fun", token.tok_fun),
	new keyword_info("goto", token.tok_goto),
	new keyword_info("if", token.tok_if),
	new keyword_info("import", token.tok_import),
	new keyword_info("in", token.tok_in),
	new keyword_info("inline", token.tok_inline),
	new keyword_info("interface", token.tok_interface),
//	new keyword_info("int", token.tok_int),
	new keyword_info("is", token.tok_is),
//	new keyword_info("long", token.tok_long),
	new keyword_info("mutable", token.tok_mutable),
	new keyword_info("namespace", token.tok_namespace),
	new keyword_info("new", token.tok_new),
	new keyword_info("not", token.tok_logicalnot),
	new keyword_info("not_eq", token.tok_notequal),
	new keyword_info("nullptr", token.tok_nullptr),
	new keyword_info("operator", token.tok_operator),
	new keyword_info("or", token.tok_logicalor),
	new keyword_info("or_eq", token.tok_bitorequal),
	new keyword_info("partia", token.tok_partial),
	new keyword_info("private", token.tok_private),
	new keyword_info("protected", token.tok_protected),
	new keyword_info("public", token.tok_public),
	new keyword_info("pure", token.tok_pure),
	new keyword_info("register", token.tok_register),
	new keyword_info("reinterpret_cast", token.tok_reinterpret_cast),
	new keyword_info("return", token.tok_return),
//	new keyword_info("short", token.tok_short),
//	new keyword_info("signed", token.tok_signed),
	new keyword_info("sizeof", token.tok_sizeof),
	new keyword_info("static", token.tok_static),
	new keyword_info("static_cast", token.tok_static_cast),
	new keyword_info("stdcal", token.tok_stdcall),
//	new keyword_info("string", token.tok_string),
	new keyword_info("struct", token.tok_struct),
	new keyword_info("switch", token.tok_switch),
	new keyword_info("template", token.tok_template),
	new keyword_info("this", token.tok_this),
	new keyword_info("thiscal", token.tok_thiscall),
	new keyword_info("throw", token.tok_throw),
	new keyword_info("true", token.tok_true),
	new keyword_info("try", token.tok_try),
	new keyword_info("typecreate", token.tok_typecreate),
	new keyword_info("typedef", token.tok_typedef),
	new keyword_info("typeid", token.tok_typeid),
	new keyword_info("typename", token.tok_typename),
	new keyword_info("union", token.tok_union),
//	new keyword_info("unsigned", token.tok_unsigned),
	new keyword_info("using", token.tok_using),
	new keyword_info("var", token.tok_var),
	new keyword_info("virtua", token.tok_virtual),
//	new keyword_info("void", token.tok_void),
	new keyword_info("volatile", token.tok_volatile),
//	new keyword_info("wchar_t", token.tok_wchar_t),
	new keyword_info("while", token.tok_while),
	new keyword_info("winclass", token.tok_winclass),
	new keyword_info("wininterface", token.tok_wininterface),
	new keyword_info("winstruct", token.tok_winstruct),
	new keyword_info("xor", token.tok_bitxor),
	new keyword_info("xor_eq", token.tok_bitxorequal),
];

//var bitInvalid = 0;	// not valid as starting character for any token
var bitDigit = 1;	// 0-9
var bitAlpha = 2;	// a-zA-Z
var bitLeadIdent = 4;// _a-zA-Z
var bitIdent = 8;	// _a-zA-Z0-9
var bitWS = 16;		// whitespace \t\r\n space
var bitToken = 32;	// a character that can be a token when on its own (i.e. not in a string, comment, etc) or doubled or with =

var maskAlpha = bitAlpha|bitLeadIdent|bitIdent;
var maskDigit = bitDigit|bitIdent;

// This array categorizes the characters [0-127] using the bit flags defined above.  This is used to decide what to do with a particular character.
var char_category : Array<number> =
[
//0x00-0x0f (0-15)
//	NUL	SOH	STX	ETX	EOT	ENQ	ACK	BEL	BS TAB    LF     VT FF CR     SO SI
    0,  0,  0,  0,  0,  0,  0,  0,  0, bitWS, bitWS, 0, 0, bitWS, 0, 0,
//0x10-0x1f (16-31)
//	DLE	DC1	DC2	DC3	DC4	NAK	SYN	ETB	CAN	EM	SUB	ESC	FS	GS	RS	US
    0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
//0x20-0x2f (32-47)
//	SPACE  !         "  #  $  %         &         '  (         )         *         +         ,         -         .         /
    bitWS, bitToken, 0, 0, 0, bitToken, bitToken, 0, bitToken, bitToken, bitToken, bitToken, bitToken, bitToken, bitToken, bitToken,
//0x30-0x3f (48-63)
//  0          1          2          3          4          5          6          7          8          9          :         ;         <         =         >         ?
    maskDigit, maskDigit, maskDigit, maskDigit, maskDigit, maskDigit, maskDigit, maskDigit, maskDigit, maskDigit, bitToken, bitToken, bitToken, bitToken, bitToken, bitToken,
//0x40-0x4f (64-79)
//  @         A          B          C          D          E          F          G          H          I          J          K          L          M          N          O
    bitToken, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha,
//0x50-0x5f (80-95)
//	P          Q          R          S          T          U          V          W          X          Y          Z          [         \  ]         ^         _
    maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, bitToken, 0, bitToken, bitToken, bitLeadIdent|bitIdent,
//0x60-0x6f (96-111)
//	`  a          b          c          d          e          f          g          h          i          j          k          l          m          n          o
    0, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha,
//0x70-0x7f (112-127)
//	p          q          r          s          t          u          v          w          x          y          z          {         |         }         ~         DEL
    maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, maskAlpha, bitToken, bitToken, bitToken, bitToken, 0,
];

// If bitToken is set in table above, the char_token table can be used to get the actual token
// char_token - char by itself
// char_token_double - char followed by itself (i.e. ++ && etc)
// char_token_equal - char followed by = (i.e. += -= etc)
// Note: << and >> are not tokenized right now to avoid potential ambig problems...
// The O below are the capital letter O, not the number 0.  This is an enum value, but allows it to look like 0 and not take up too much space below.
var char_token : Array<token> =
[
	//0x00-0x0f (0-15)
//	NUL      SOH      STX      ETX      EOT      ENQ      ACK      BEL      BS       TAB      LF       VT       FF       CR       SO       SI
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x10-0x1f (16-31)
//	DLE      DC1      DC2      DC3      DC4      NAK      SYN      ETB      CAN      EM       SUB      ESC      FS       GS       RS       US
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x20-0x2f (32-47)
//	SPACE    !                     "        #        $        %              &                 '        (                 )                 *                +               ,                -                .              /
	token.O, token.tok_logicalnot, token.O, token.O, token.O, token.tok_mod, token.tok_bitand, token.O, token.tok_lparen, token.tok_rparen, token.tok_times, token.tok_plus, token.tok_comma, token.tok_minus, token.tok_dot, token.tok_div,
	//0x30-0x3f (48-63)
//  0        1        2        3        4        5        6        7        8        9        :                ;                    <             =                >             ?
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.tok_colon, token.tok_semicolon, token.tok_lt, token.tok_equal, token.tok_gt, token.tok_ternary,
	//0x40-0x4f (64-79)
//  @             A        B        C        D        E        F        G        H        I        J        K        L        M        N        O
	token.tok_at, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x50-0x5f (80-95)
//	P        Q        R        S        T        U        V        W        X        Y        Z        [                   \        ]                   ^                 _
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.tok_lbracket, token.O, token.tok_rbracket, token.tok_bitxor, token.O,
	//0x60-0x6f (96-111)
//	`        a        b        c        d        e        f        g        h        i        j        k        l        m        n        o
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x70-0x7f (112-127)
//	p        q        r        s        t        u        v        w        x        y        z        {                 |                }                 ~                DEL
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.tok_lbrace, token.tok_bitor, token.tok_rbrace, token.tok_compl, token.O,
];

var char_token_double: Array<token> =
[
	//0x00-0x0f (0-15)
//	NUL      SOH      STX      ETX      EOT      ENQ      ACK      BEL      BS       TAB      LF       VT       FF       CR       SO       SI
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x10-0x1f (16-31)
//	DLE      DC1      DC2      DC3      DC4      NAK      SYN      ETB      CAN      EM       SUB      ESC      FS       GS       RS       US
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x20-0x2f (32-47)
//	SPACE    !        "        #        $        %        &                     '        (        )        *        +                   ,        -                     .                    /
	token.O, token.O, token.O, token.O, token.O, token.O, token.tok_logicaland, token.O, token.O, token.O, token.O, token.tok_plusplus, token.O, token.tok_minusminus, token.tok_doubledot, token.O,
	//0x30-0x3f (48-63)
//  0        1        2        3        4        5        6        7        8        9        :                   ;        <        =                     >        ?
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.tok_scoperes, token.O, token.O, token.tok_equalequal, token.O, token.O,
	//0x40-0x4f (64-79)
//  @             A        B        C        D        E        F        G        H        I        J        K        L        M        N        O
	token.tok_at, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x50-0x5f (80-95)
//	P        Q        R        S        T        U        V        W        X        Y        Z        [        \        ]        ^        _
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x60-0x6f (96-111)
//	`        a        b        c        d        e        f        g        h        i        j        k        l        m        n        o
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x70-0x7f (112-127)
//	p        q        r        s        t        u        v        w        x        y        z        {        |                    }        ~        DEL
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.tok_logicalor, token.O, token.O, token.O,
];

var char_token_equal : Array<token> =
[
	//0x00-0x0f (0-15)
//	NUL      SOH      STX      ETX      EOT      ENQ      ACK      BEL      BS       TAB      LF       VT       FF       CR       SO       SI
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x10-0x1f (16-31)
//	DLE      DC1      DC2      DC3      DC4      NAK      SYN      ETB      CAN      EM       SUB      ESC      FS       GS       RS       US
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x20-0x2f (32-47)
//	SPACE    !                   "        #        $        %                   &                      '        (        )        *                     +                    ,        -                     .        /
	token.O, token.tok_notequal, token.O, token.O, token.O, token.tok_modequal, token.tok_bitandequal, token.O, token.O, token.O, token.tok_timesequal, token.tok_plusequal, token.O, token.tok_minusequal, token.O, token.tok_divequal,
	//0x30-0x3f (48-63)
//  0        1        2        3        4        5        6        7        8        9        :        ;        <                  =                     >                  ?
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.tok_ltequal, token.tok_equalequal, token.tok_gtequal, token.O,
	//0x40-0x4f (64-79)
//  @        A        B        C        D        E        F        G        H        I        J        K        L        M        N        O
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x50-0x5f (80-95)
//	P        Q        R        S        T        U        V        W        X        Y        Z        [        \        ]        ^                      _
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.tok_bitxorequal, token.O,
	//0x60-0x6f (96-111)
//	`        a        b        c        d        e        f        g        h        i        j        k        l        m        n        o
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O,
	//0x70-0x7f (112-127)
//	p        q        r        s        t        u        v        w        x        y        z        {        |                     }        ~        DEL
	token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.O, token.tok_bitorequal, token.O, token.O, token.O,
];

function islinebreak(ch: string) : boolean
{
    return (ch == CR) || (ch == LF); // \r \n
}

enum char_context
{
	cc_charlit,
	cc_stringlit
};

enum constant_type
{
	ct_none,
	ct_ui1,
	ct_i1,
	ct_ui2,
	ct_i12,
	ct_ui4,
	ct_i4,
	ct_ui8,
	ct_i8
};

enum constant_form
{
	cf_octal,
	cf_hex,
	cf_decimal
};

enum number_scan_state
{
	nssDigits,
	nssFoundDecimal,
	nssFoundE,
	nssFoundSignAfterE,
	nssFoundDigitsAfterE,
	nssFoundDecimalAfterE,
	nssFoundF,
	nssFoundU,
	nssFoundL,
	nssFoundIntegerL,
	nssFoundIntegerLL,
};

class line_col_1based
{
	line: number;
	col: number;
	constructor()
	{
        this.line = 1;
        this.col = 1;
	}
	// constructor(line: number, col: number)
	// {
    //     this.line = line;
    //     this.col = col;
	// }
	// line_col_1based(const line_col_1based& lc) : line(lc.line), col(lc.col)
	// {
	// }
};

class SFA
{
    filename: string;
    offset: number;
    linecol : line_col_1based;
    constructor()
    {
        this.filename = "";
        this.offset = 0;
        this.linecol = new line_col_1based();
    }
};

class Reader
{
    buffer : string;
    offset: number;
    constructor(buffer: string)
    {
        this.buffer = buffer;
        this.offset = 0;
    }
    GetFilename() : string
    {
        return "internal";
    }
    GetOffset(): number
    {
        return this.offset;
    }
    GetChar() : string
    {
        if (this.offset >= this.buffer.length)
            return eofchar;
        return this.buffer[this.offset];
    }
    PopChar() : string
    {
        return this.buffer[this.offset++];
    }
};

class line_table
{
	currentLineCol: line_col_1based;
	offset: number;
	private fLastCharWasCR: boolean;
    private vecOffsets: Array<number>; //file offsets for each line

    constructor()
	{
        this.fLastCharWasCR = false;
        this.offset = 0;
        this.currentLineCol = new line_col_1based();
        this.vecOffsets = new Array<number>();
		this.vecOffsets.push(0); //first line starts at 0 offset...
	}
	processchar(ch: string): void
	{
		this.offset++;
		if (ch == '\r')
		{
			this.vecOffsets.push(this.offset);
			this.increment_line();
			this.fLastCharWasCR = true;
		}
		else if (ch == '\n')
		{
			if (this.fLastCharWasCR)
			{
                var len = this.vecOffsets.length;
                this.vecOffsets[len - 1] = this.offset; //Adjust offset for start of new line to be after the \n
				this.fLastCharWasCR = false;
			}
			else
			{
				this.vecOffsets.push(this.offset);
				this.increment_line();
			}
		}
		else
		{
			this.fLastCharWasCR = false;
			this.currentLineCol.col++;
		}
	}

	LineFromOffset(offset: number): number
	{
		// auto iter = std::lower_bound(vecOffsets.begin(), vecOffsets.end(), offset);
        // return static_cast<unsigned long>(iter - vecOffsets.begin() + 1);
        return 1;
	}

//private:
	private increment_line(): void
	{
		this.currentLineCol.line++;
		this.currentLineCol.col = 1;
	}
};

enum error_flags
{
	ef_none = 0,
	ef_return = 1,			// return from error report
	ef_noerrorvalue = 2,	// don't display error number (used for sub-errors)
	ef_indent = 4,			// indent the error by 8 spaces
};
//CORE_ENABLE_BITFIELD_ENUM_OPERATORS(error_flags);

// The normal option for reporting errors is just true/false (which sets the ef_return) flag.
class ErrorOption
{
	ef: error_flags;
	constructor(f: boolean)
	{
		this.ef = f ? error_flags.ef_return : error_flags.ef_none;
	}
};

interface IReportError
{
	Report(err: errors, fReturn: boolean, sfa: SFA, str1?: string, str2?: string): void;
	ReportOpt(err: errors, opt: ErrorOption, sfa: SFA, str1?: string, str2?: string): void;
};

class ErrorReporter implements IReportError
{
	Report(err: errors, fReturn: boolean, sfa: SFA, str1?: string, str2?: string): void {}
	ReportOpt(err: errors, opt: ErrorOption, sfa: SFA, str1?: string, str2?: string): void {}
};

class constant_value
{
    u1: number;
    s1: number;
    u2: number;
    s2: number;
    u4: number;
    s4: number;
    u8: number;
    s8: number;
    constructor()
    {
        this.u1 = 0;
        this.s1 = 0;
        this.u2 = 0;
        this.s2 = 0;
        this.u4 = 0;
        this.s4 = 0;
        this.u8 = 0;
        this.s8 = 0;
    }
};

class Lexer
{
    // const LF: number = '\n'.charCodeAt(0);
    // const CR: number = '\r'.charCodeAt(0);

    m_fInMultiLineComment : boolean;
    reader: Reader;
    er: IReportError;
	lines: line_table;
	positionToken: line_col_1based;
	offsetToken: number; //beginning offset of token
    vectext: string;
    constantValue: constant_value;
	// Information about constants.
	// union
	// {
	// 	unsigned char u1;
	// 	signed char s1;
	// 	unsigned short u2;
	// 	short s2;
	// 	unsigned long u4;
	// 	long s4;
	// 	unsigned __int64 u8;
	// 	__int64 s8;
	// } constantValue;
	constantType: constant_type;
	constantSuffix: constant_type; //optional - force to a particular type...
	constantForm: constant_form; //octal, hex, dec,

	constructor(er: IReportError, r: Reader)
	{
        this.m_fInMultiLineComment = false;
        this.reader = r;
        this.er = er;
        this.lines = new line_table();
        this.positionToken = new line_col_1based();
        this.offsetToken = 0;
        this.vectext = "";
        this.constantType = constant_type.ct_none;
        this.constantSuffix = constant_type.ct_none;
        this.constantForm = constant_form.cf_decimal;
        this.constantValue = new constant_value();
	}
	GetTokenPos(): line_col_1based
	{
		return this.positionToken;
	}
	GetTokenOffset(): number
	{
		return this.offsetToken;
	}
	GetToken(sfaBegin: SFA, sfaEnd: SFA) : token
	{
		var tok: token;
		sfaBegin.filename = sfaEnd.filename = this.reader.GetFilename();
		if (this.m_fInMultiLineComment)
		{
			tok = token.tok_multicomment;
			this.ScanMultiLineComment();
		}
		else
			tok = this.GetTokenHelper(sfaBegin);
		sfaEnd.linecol = this.lines.currentLineCol;
		sfaEnd.offset = this.lines.offset;
		return tok;
	}
    GetTokenHelper(sfaBegin: SFA) : token
    {
        // Initialize
        this.vectext = "";

        var chcls: number;

        var tok: token = token.tok_end;
        while (1)
        {
            // Remember start position of next token
            sfaBegin.linecol = this.positionToken = this.lines.currentLineCol;
            sfaBegin.offset = this.offsetToken = this.lines.offset;

            // reader.getch does not remove the character from the reader.
            var ch: string = this.reader.GetChar();
            if (ch == eofchar)
                return tok; //returns current tok or tok_end

            chcls = this.GetCharClass(ch);
            // start of identifier or keyword?
            if (chcls & bitLeadIdent)
            {
                this.vectext += ch;
                this.Pop();
                this.ScanIdentifier();
                return this.IdentToToken();
            }
            // whitespace
            else if (chcls & bitWS) // skip whitespace
            {
                this.Pop();
                continue;
            }
            // start of a number
            else if (chcls & bitDigit)
            {
                var tok: token = this.ScanNumber();
                return tok;
            }
            // possible comment or divide
            else if (ch == '/')
            {
                this.Pop();
                ch = this.reader.GetChar();
                if (ch == '/')
                {
                    this.ScanSingleLineComment();
                    return token.tok_singlecomment;
                }
                else if (ch == '*')
                {
                    this.m_fInMultiLineComment = true;
                    this.ScanMultiLineComment();
                    return token.tok_multicomment;
                }
                else if (ch == '=') // /=
                {
                    this.Pop();
                    return token.tok_divequal;
                }
                else //don't pop because we already did
                    return token.tok_div;
            }
            else if (chcls & bitToken) // character that can be a token on its own...
            {
                this.Pop();
                return this.ScanToken(ch);
            }
            else if (ch == '"') // string
            {
                this.Pop();
                this.ScanString();
                return token.tok_stringliteral;
            }
            else if (ch == '\'') // character literal
            {
                this.Pop();
                this.ScanCharLiteral();
                return token.tok_charliteral;
            }
            else if (ch == '#') //
            {
                this.vectext += ch;
                this.Pop();
                this.ScanIdentifier();
                var t: token = this.IdentToToken();
                if (t == token.tok_ident)
                {
//                    this.er.Report(errors.UNKNOWN_DIRECTIVE, false, sfaBegin, &vectext[0]);
                    this.er.Report(errors.UNKNOWN_DIRECTIVE, false, sfaBegin);
                    this.Pop();
                }
                else
                    return t;
            }
            else // unhandled character...
            {
                this.IssueError(errors.SYNTAX_ERROR, false);
                this.Pop();
            }
        }
        return token.tok_end; // Should never get here.
    }
    GetTokenText() : string
	{
		return this.vectext;
	}
	GetFilename(): string
	{
		return this.reader.GetFilename();
	}
	GetCurrentOffset(): number
	{
		return this.reader.GetOffset();
	}
	IssueError(err: errors, fReturn: boolean): void
	{
        var sfa = new SFA();
        sfa.filename = this.reader.GetFilename();
        sfa.linecol = this.lines.currentLineCol;
		this.er.Report(err, fReturn, sfa);
	}
	GetConstantValue(): number
	{
		switch (this.constantType)
		{
		case constant_type.ct_none:
		case constant_type.ct_i1:
		case constant_type.ct_i12:
		case constant_type.ct_i4:
		case constant_type.ct_i8:
        default:
            throw "assertion";
//			assert(false);
			break;
		case constant_type.ct_ui1:
			return this.constantValue.u1;
			break;
		case constant_type.ct_ui2:
			return this.constantValue.u2;
			break;
		case constant_type.ct_ui4:
			return this.constantValue.u4;
			break;
		case constant_type.ct_ui8:
			return this.constantValue.u8;
			break;
		}
		return 0;
	}
//private:
	Pop(): void // calls into reader.pop, but also updates current position and linetable
	{
		this.lines.processchar(this.reader.PopChar());
    }
    ScanToGreater(): string // scan until >
    {
        var out: string = "";
        var ch = this.reader.GetChar(); // get the <
        while (1)
        {
            ch = this.reader.GetChar();
            if (ch == eofchar)
                break;
            if (ch == ">")
                break;
            out += ch;
            this.Pop();
        }
        return out;
    }
    ScanString(): void // Called after initial " is seen
    {
        while (1)
        {
            var ch = this.reader.GetChar();
            if (ch == '"')
                break;
            else if (ch == eofchar)
            {
                this.IssueError(errors.UNEXPECTED_EOF, false);
                return;
            }
            
            ch = this.ScanChar(char_context.cc_stringlit);
            this.vectext += ch;
        }
        this.Pop();
    }
    ScanSingleLineComment(): void
    {
        while (1)
        {
            var ch = this.reader.GetChar();
            if (ch == eofchar)
                return;
            if (islinebreak(ch))
                return;
            this.vectext += ch;
            this.Pop();
        }
    }
    ScanMultiLineComment(): void
    {
        while (1)
        {
            var ch = this.reader.GetChar();
            if (ch == eofchar)
            {
                this.IssueError(errors.UNEXPECTED_EOF, false);
                return;
            }
            this.Pop();
            if (ch == '*')
            {
                // look ahead to see if the comment is ended
                var ch2 = this.reader.GetChar();
                if (ch2 == eofchar)
                {
                    this.IssueError(errors.UNEXPECTED_EOF, false);
                    return;
                }
                if (ch2 == '/')
                {
                    this.Pop();
                    this.m_fInMultiLineComment = false; // we successfully finished scanning
                    return;
                }
            }
            else // add character and keep looking for end of comment
                this.vectext += ch;
        }
    }

    ScanIdentifier(): void
    {
        while (1)
        {
            var ch = this.reader.GetChar();
            if (ch == eofchar)
                return;
            var chcls = this.GetCharClass(ch);
            if (!(chcls & bitIdent))  //End of identifier
                return;
            this.vectext += ch;
            this.Pop();
        }
    }
    ScanNumber(): token
    {
        var nss: number_scan_state = number_scan_state.nssDigits;
        if (this.GetCharClass('.') != bitToken)
            throw "assertion";
//        assert(GetCharClass('.') == bitToken);

        var ch = this.reader.GetChar();
        //if (ch == eofchar)
        //{
        //	constantForm = cf_decimal;
        //	constantType = ct_ui1;
        //	constantSuffix = ct_none;
        //	constantValue.u1 = chStart - L'0';
        //	return tok;
        //}

        if (ch == '0') // either octal or hex...
        {
            this.vectext += ch;
            this.Pop();
            ch = this.reader.GetChar();
            if (ch == 'x') // 0x
            {
                this.constantForm = constant_form.cf_hex;
                this.Pop();
                return this.ScanHex();
            }
            else if (this.GetCharClass(ch) & bitDigit) // 0n where n is a number
            {
                this.constantForm = constant_form.cf_octal;
                return this.ScanOctal();
            }
        }

    //	vectext.push_back(ch);

        var value: number = 0;
        this.constantForm = constant_form.cf_decimal;
        this.constantSuffix = constant_type.ct_none; // TODO - support parsing suffix

        while (1)
        {
            if (ch == eofchar)
                break;

            var chcls = this.GetCharClass(ch);

            switch (nss)
            {
            case number_scan_state.nssDigits:
                switch (ch)
                {
                case '.':
                case 'e': case 'E':
                case 'f': case 'F':
                    return this.ScanFloat();
                    break;
                default:
                    if (!(chcls & bitDigit))
                    {
                        if (!(chcls & (bitWS | bitToken)))
                        this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);

                        /* Done with this literal. */
                        this.SetTypeValue(value);
                        return token.tok_integer;
                    }
                    else
                    {
                        //__int64 add = (ch - L'0');
                        //__int64 oldvalue = value;
                        var add: number = ch.charCodeAt(0) - '0'.charCodeAt(0);
                        var oldvalue: number = value;
                        value = value * 10 + add;
                        if ((value-add)/10 != oldvalue)
                        this.IssueError(errors.CONSTANT_TOO_BIG, true);
                    }

                    break;
                };
                break;
            };

            /* Normal case, proceed in current state. */
            this.vectext += ch;
            this.Pop();
            ch = this.reader.GetChar();
        }
        this.SetTypeValue(value);
        return token.tok_integer;
    }

    ScanHex(): token
    {
        var value: number = 0;

        this.constantForm = constant_form.cf_hex;
        this.constantSuffix = constant_type.ct_none;
        while (1)
        {
            var ch = this.reader.GetChar();
            if (ch == eofchar)
                break;
            var ch_code: number = ch.charCodeAt(0);
            var add: number = 0;

            var chcls = this.GetCharClass(ch);
            if ((ch_code >= code_0) && (ch_code <= code_9))
                add = (ch_code - code_0);
            else if ((ch_code >= code_a) && (ch_code <= code_f))
                add = (ch_code - code_a + 10);
            else if ((ch_code >= code_A) && (ch_code <= code_F))
                add = (ch_code - code_A + 10);
            else if (!(chcls & (bitWS | bitToken)))
            {
                this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);
                break;
            }
            else
                break;
            var oldvalue: number = value;
            value = 16 * value + add;
            if ((value-add)/16 != oldvalue)
                this.IssueError(errors.CONSTANT_TOO_BIG, true);

            this.Pop();
        }
        this.SetTypeValue(value);
        return token.tok_integer;
    }

    ScanOctal(): token
    {
        var value: number = 0;

        this.constantForm = constant_form.cf_octal;
        this.constantSuffix = constant_type.ct_none;


        while (1)
        {
            var ch = this.reader.GetChar();
            if (ch == eofchar)
                break;
            var add: number = 0;
            var chcls = this.GetCharClass(ch);

            var ch_code: number = ch.charCodeAt(0);

            if ((ch_code >= code_0) && (ch_code <= code_7))
                add = (ch_code - code_0);
            else if (!(chcls & (bitWS | bitToken)))
            {
                this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);
                break;
            }
            else
                break;
            var oldvalue: number = value;
            value = 8 * value + add;
            if ((value-add)/8 != oldvalue)
                this.IssueError(errors.CONSTANT_TOO_BIG, true);
            this.Pop();
        }
        this.SetTypeValue(value);
        return token.tok_integer;
    }

    ScanFloat(): token // called by ScanNumber when it realizes the number is floating point...
    {
        var tok: token = token.tok_real;

        var nss: number_scan_state = number_scan_state.nssDigits;

        while (1)
        {
            var ch = this.reader.GetChar();
            if (ch == eofchar)
                return tok;

            var chcls = this.GetCharClass(ch);

            switch (nss)
            {
            case number_scan_state.nssDigits:
                switch (ch)
                {
                case '.':
                    tok = token.tok_real;
                    nss = number_scan_state.nssFoundDecimal;
                    break;
                case 'f': case 'F':
                    tok = token.tok_real;
                    nss = number_scan_state.nssFoundF;
                    break;
                case 'e': case 'E':
                    tok = token.tok_real;
                    nss = number_scan_state.nssFoundE;
                    break;
                default:
                    //assert(false);
                    throw "assertion";
                    break;
                };
                break;

            case number_scan_state.nssFoundDecimal:
                switch (ch)
                {
                case '.':
                    this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);
                    break;

                case 'f': case 'F': nss = number_scan_state.nssFoundF; break;
                case 'e': case 'E': nss = number_scan_state.nssFoundE; break;
                case 'l': case 'L': nss = number_scan_state.nssFoundL; break;

                default:
                    if (!(chcls & bitDigit))
                    {
                        if (!(chcls & (bitWS | bitToken)))
                            this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);

                        /* Done with this literal. */
                        return tok;
                    }
                    break;
                };
                break;

            case number_scan_state.nssFoundSignAfterE:
                if (!(chcls & bitDigit))
                    this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);
                nss = number_scan_state.nssFoundDigitsAfterE;
                break;

            case number_scan_state.nssFoundDigitsAfterE:
                switch (ch)
                {
                case '.':
                    nss = number_scan_state.nssFoundDecimalAfterE;
                    break;

                case 'f': case 'F': nss = number_scan_state.nssFoundF; break;
                case 'l': case 'L': nss = number_scan_state.nssFoundL; break;

                default:
                    if (!(chcls & bitDigit))
                    {
                        if (!(chcls & (bitWS | bitToken)))
                            this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);

                        /* Done with this literal. */
                        return tok;
                    }
                    break;
                };
                break;

            case number_scan_state.nssFoundDecimalAfterE:
                switch (ch)
                {
                case 'f': case 'F': nss = number_scan_state.nssFoundF; break;
                case 'l': case 'L': nss = number_scan_state.nssFoundL; break;

                default:
                    if (!(chcls & bitDigit))
                    {
                        if (!(chcls & (bitWS | bitToken)))
                            this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);

                        /* Done with this literal. */
                        return tok;
                    }
                    break;
                };
                break;

            case number_scan_state.nssFoundF:
                if (!(chcls & (bitWS | bitToken)))
                    this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);
                return tok;

            case number_scan_state.nssFoundE:
                if (ch == '-' || ch == '+')
                    nss = number_scan_state.nssFoundSignAfterE;
                else if (ch == '.')
                    nss = number_scan_state.nssFoundDecimalAfterE;
                else if (!(chcls & bitDigit))
                    this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);
                else
                    nss = number_scan_state.nssFoundDigitsAfterE;
                break;
            case number_scan_state.nssFoundL:
                if (!(chcls & (bitWS | bitToken)))
                    this.IssueError(errors.BAD_SUFFIX_ON_NUMBER, false);
                else/* Done with this literal. */
                    return tok;
                break;
            };

            /* Normal case, proceed in current state. */
            this.vectext += ch;
            this.Pop();
        }
        return tok;
    }
    SetTypeValue(value: number): void
    {
        if (value <= 0xff)
        {
            this.constantType = constant_type.ct_ui1;
            this.constantValue.u1 = value;
        }
        else if (value <= 0xffff)
        {
            this.constantType = constant_type.ct_ui2;
            this.constantValue.u2 = value;
        }
        else if (value <= 0xffffffff)
        {
            this.constantType = constant_type.ct_ui4;
            this.constantValue.u4 = value;
        }
        else if (value <= 0xffffffffffffffff)
        {
            this.constantType = constant_type.ct_ui8;
            this.constantValue.u8 = value;
        }
        else
        {
            throw "assertion";
//            assert(false);
    //		constantType = ct_ui16;
    //		constantValue.u16 = value;
        }
    }

    ScanChar(cc: char_context): string
    {
        var fEscape: boolean = false;
        var ch: string = ""
        while (1)
        {
            ch = this.reader.GetChar();
            if (ch == eofchar)
            this.IssueError(errors.UNEXPECTED_EOF, false);
            if (fEscape)
            {
                switch(ch)
                {
                case '\\':
                case '\'':
                case '\"':
                    break;
                case 'n':
                    ch = '\n';
                    break;
                case 'r':
                    ch = '\r';
                    break;
                case '0':
                    ch = '\0';
                    break;
                default:
                    this.IssueError(errors.UNSUPPORTED_ESACAPE_CHAR, true);
                    // just return ch...
                    break;
                }
                break;
            }
            else if (ch == '\\') // escape char...
            {
                this.Pop();
                fEscape = true;
            }
            else if (ch == '\'')
            {
                if (cc == char_context.cc_charlit) // hmmm no char...
                {
                    this.IssueError(errors.EMPTY_CHAR_CONSTANT, true);
                    return eofchar; // don't pop...
                }
                break;
            }
            else if (ch == '\"')
            {
                if (cc == char_context.cc_stringlit) // hmmm no char...
                {
                    throw "assertion";
//                    assert(false);
                }
                break;
            }
            else
                break;
        }
        this.Pop();
        return ch;
    }

    ScanCharLiteral(): void
    {
//        var fEscape: boolean = false;
        while (1)
        {
            var ch = this.reader.GetChar();
            if (ch == '\'') // end of literal
                break;
            else if (ch == eofchar)
                this.IssueError(errors.UNEXPECTED_EOF, false);

            ch = this.ScanChar(char_context.cc_charlit);
            this.vectext += ch;
        }
        this.Pop();
        if (this.vectext.length > 4)
            this.IssueError(errors.TOO_MANY_CHARS_IN_CONSTANT, true);
        return;
    }

    ScanToken(ch: string): token
    {
        var index: number = ch.charCodeAt(0);
        this.vectext = "";
        this.vectext += ch;
        var tok: token = token.O;
        var ch2 = this.reader.GetChar();
        if (ch2 == eofchar) // no more characters...
        {
            tok = char_token[index];
        }
        else
        {
            // Check if there is a double char token
            if ((char_token_double[index] != token.O) && (ch == ch2)) // double char token (e.g. && || ==)
            {
                this.Pop();
                tok = char_token_double[index];
                this.vectext += ch2;
                // special case - If we see tok_doubledot, check for three dots.
                // TODO - consider generalizing the triple char case...
                if ((tok == token.tok_doubledot) && (this.reader.GetChar() == '.')) // ellipsis
                {
                    this.Pop();
                    tok = token.tok_ellipsis;
                    this.vectext += '.';
                }
            }
            // Check for a char= token
            else if ((char_token_equal[index] != token.O) && (ch2 == '=')) // char= token (e.g. += -= *=)
            {
                this.Pop();
                tok = char_token_equal[index];
                this.vectext += ch2;
            }
            else
            {
                // SPECIALTOKENS - Add more cases here for "special tokens"
                if ((ch == '-') && (ch2 == '>'))
                {
                    tok = token.tok_arrow;
                    this.Pop();
                }
                else // Already popped single char so don't pop the second one as we didn't consume it.
                    tok = char_token[index];
            }
        }
        if (tok == token.O) // Token is missing in the char_token table.
            this.IssueError(errors.INTERNAL_COMPILER_TOKENTABLE_ERROR, false);
        return tok;
    }

    IdentToToken(): token
    {
        for(let i=0; i<keywords.length; i++) {
            var item = keywords[i];
            if (item.keyword == this.vectext)
                return item.tok;
        }
        return token.tok_ident;
    }


	GetCharClass(ch: string): number
	{
        var ich = ch.charCodeAt(0);
		if (ich < 128)
			return char_category[ich];
		// TODO - allow other Unicode chars to be used in identifiers.
		return 0;
	}
};

enum AstKind
{
   AST_EMPTY,
   AST_LABELED,
   AST_EXPRESSION,
   AST_NULLSTMT,
   AST_COMPOUND,
   AST_IF,
   AST_SWITCH,
   AST_WHILE,
   AST_DO,
   AST_FOR,
   AST_BREAK,
   AST_CONTINUE,
   AST_LEAVE,
   AST_GOTO,
   AST_RETURN,
   AST_TRY,
   AST_CATCHLIST,
   AST_CATCH,
   AST_TRYEXCEPT,
   AST_TRYFINALLY,
   AST_THUNK,
   AST_DECLARATION,
   AST_VARDEFINITION, //variable def
   AST_COFUNCDECL, // Wrapper form
   AST_COFUNCDEFN, // Wrapper form
   AST_VIRTUALFUNCDECL,
   AST_EXTERNFUNCDECL,
   AST_FUNCDEFN,
   AST_CODESCOPE,
   AST_PRAGMA,
   AST_ASM,
   AST_CONSTANT,
   AST_CONSTANTREAL,
   AST_BOOLLITERAL,
   AST_CHARLIT,
   AST_STRINGLIT,
   AST_CURRENTOBJECT,
   AST_ALLOTEMP,
   AST_PMLITERAL,
   AST_SYMBOL,
   AST_TYPESPECIFIER,
   AST_INTRINSIC,
   AST_PAREN,
   AST_DEREF,
   AST_TAKEREF,
   AST_USEREF,
   AST_STACKARG,
   AST_ADDRESS,
   AST_HANDLE,
   AST_UPLUS,
   AST_UMINUS,
   AST_NOT,
   AST_BITNOT,
   AST_ASSUME,
   AST_CASTEX,	// Only exists in generated code where we don't have a textual representation of a type
   AST_CAST,
   AST_STATICCAST,
   AST_CONSTCAST,
   AST_REINTERPRETCAST,
   AST_DYNAMICCAST,
   AST_EHSTATESLIST,
   AST_DTORLIST,
   AST_BASEINIT,
   AST_SIZEOFEXPR,
   AST_SIZEOFTYPE,
   AST_ALIGNOFEXPR,
   AST_ALIGNOFTYPE,
   AST_TYPEIDEXPR,
   AST_TYPEIDTYPE,
   AST_INDEX,
   AST_COMMA,
   AST_DOTSTAR,
   AST_ARROWSTAR,
   AST_MULT,
   AST_DIV,
   AST_REM,
   AST_PLUS,
   AST_MINUS,
   AST_LSHIFT,
   AST_RSHIFT,
   AST_LT,
   AST_LE,
   AST_GT,
   AST_GE,
   AST_EQUALS,
   AST_NE,
   AST_BITAND,
   AST_XOR,
   AST_BITOR,
   AST_AND,
   AST_OR,
   AST_ASSIGN,
   AST_ASSIGNMULT,
   AST_ASSIGNDIV,
   AST_ASSIGNREM,
   AST_ASSIGNPLUS,
   AST_ASSIGNMINUS,
   AST_ASSIGNLSHIFT,
   AST_ASSIGNRSHIFT,
   AST_ASSIGNAND,
   AST_ASSIGNXOR,
   AST_ASSIGNOR,
   AST_PREINCR,
   AST_PREDECR,
   AST_POSTINCR,
   AST_POSTDECR,
   AST_ADDR_ADD,
   AST_ADDR_SUB,
   AST_ADDR_FIELD,
   AST_MFUNC,
   AST_DOT,
   AST_ARROW,
   AST_POINTSTO,
   AST_THROW,
   AST_CORTHROW,
   AST_QUESTION,
   AST_FUNCTIONCALL,
   AST_ARGUMENTS,
   AST_ALLOCATOR_NEW,
   AST_NEW,
   AST_ARRAYNEW,
   AST_ALLOCATOR_ARRAYNEW,
   AST_ALLOCATOR_ARRAYDELETE,
   AST_ALLOCATOR_DELETE,
   AST_DELETE,
   AST_ARRAYDELETE,
   AST_INITLIST,
   AST_INITCLAUSE,
   AST_POPSTATE,
   AST_DTORACTION,
   AST_PUSHSTATE,
   AST_DEFARG,
   AST_VTORDISPLACEMENT,
   AST_EXPLICITOVERRIDE,
   AST_LABEL,
   AST_CASE,
   AST_DEFAULT,
   AST_ROOT,
   AST_SEQUENCE,
   AST_SCOPEDEXPR,
   AST_DECLARATIONS,
   AST_TYPEDECL,
   AST_STRUCT,
   AST_CLASS,
   AST_COCLASS,
   AST_INTERFACE,
   AST_COINTERFACE,
   AST_WINCLASS,
   AST_WININTERFACE,
   AST_WINSTRUCT,
   AST_NAMESPACE,
   AST_ENUM,
   AST_ERROR,
   AST_MODULE,
   AST_FILE,
   AST_IMPORT,
   // type representation
   AST_TYPELIST,	// parent node of type expression
   AST_BASELIST,  // parent node of base class list
   AST_BASE, // node representing individual base class
   AST_POINTER,
   AST_REFERENCE,
   AST_ARRAY,
   AST_SYMBOLTYPE,
   AST_FUNTYPE,
   AST_RECORDSCOPE,
   AST_NAMESPACESCOPE,
   AST_ENUMSCOPE,
   AST_ENUMITEM,
   AST_CONSTRUCTOR,
   AST_DESTRUCTOR,
   AST_TYPECREATE,
   AST_TYPEDEF,
   AST_RECORDTEMPLATE,
   AST_TEMPLATEPARAM,
   AST_TEMPLATEPACKPARAM, // Template pack parameter
   AST_TEMPLATEUNPACK, // Template unpack
   AST_VIEW,
   AST_VIEWDEREF,
   AST_NAME, // Simple name node.  Used by several things.
};

class Node
{
    kind: AstKind;
    parentNode: Node | null;
    children: Array<Node>;
    name: string | null;
    hasParens: boolean;
    level: number;
    constructor(kind: AstKind)
    {
        this.kind = kind;
        this.parentNode = null;
        this.name = null;
        this.children = new Array<Node>();
        this.hasParens = false;
        this.level = -1;
    }
	AddChildNode(child: Node): void
	{
		// We should only be calling AddChildNode on nodes with an unlimited number of nodes.
        // Otherwise, we should be explicitly setting the correct node.
		child.parentNode = this;
		this.children.push(child);
	}
};

class Parser
{
    er: IReportError;
	lexer: Lexer;
	tok: token;
	sfaTokBegin: SFA;
	sfaTokEnd: SFA;
	sfaTokLast: SFA;

    constructor(er: IReportError, lexer: Lexer)
	{
        this.er = er;
        this.lexer = lexer;
        this.tok = token.O;
        this.sfaTokBegin = new SFA();
        this.sfaTokEnd = new SFA();
        this.sfaTokLast = new SFA();
	}

	GetToken(): void
	{
		this.sfaTokLast = this.sfaTokBegin;
		do 
		{
            this.tok = this.lexer.GetToken(this.sfaTokBegin, this.sfaTokEnd);
			if ((this.tok != token.tok_singlecomment) && (this.tok != token.tok_multicomment))
				break; //skip comments for now
			// TODO - record comment tokens so they can be attached to next token.
            // if (this.tok == token.tok_end)
            //     break;
		} while (1);
	}

//	Ast::FileNode* parse(const std::wstring& name);

// public:
// 	template <typename T>
// 	T* CreateNode()
// 	{
// 		T* p = new T();
// 		p->sfa = sfaTokBegin;
// 		return p;
// 	}
// 	template <typename T>
// 	T* CreateNodeWithSFA(SFA& sfa)
// 	{
// 		T* p = new T();
// 		p->sfa = sfa;
// 		return p;
// 	}
// 	template <typename T, class A1>
// 	T* CreateNode(A1 && a1)
// 	{
// 		T* p = new T(a1);
// 		p->sfa = sfaTokBegin;
// 		return p;
// 	}
// 	template <typename T, class A1, class A2>
// 	T* CreateNode(A1 && a1, A2 && a2)
// 	{
// 		T* p = new T(a1, a2);
// 		p->sfa = sfaTokBegin;
// 		return p;
// 	}
// 	template <typename T, class A1, class A2, class A3>
// 	T* CreateNode(A1 && a1, A2 && a2, A3 && a3)
// 	{
// 		T* p = new T(a1, a2, a3);
// 		p->sfa = sfaTokBegin;
// 		return p;
// 	}

// 	void AddTypeModifier(Types::TypeFlags& tf, Types::TypeFlags flag)
// 	{
// 		if (tf & flag)
// 			er.Report(errors::DUPLICATE_TYPE_MODIFIER, true, sfaTokBegin);
// 		tf |= flag;
// 		GetToken();
// 	}
// 	// Eat tokens through end of line...
// 	void RecoverToNextLine()
// 	{
// 		unsigned long line = sfaTokBegin.linecol.line;
// 		while (tok != tok_end)
// 		{
// 			GetToken();
// 			if (line != sfaTokBegin.linecol.line)
// 				return;
// 		}
// 	}
// 	// Eat tokens up to and including one of the specified tokens
// 	template<size_t len>
// 	void Recover(const token t[len])
// 	{
// 		while (tok != tok_end)
// 		{
// 			for (size_t i = 0;i<len;i++)
// 			{
// 				if (tok == t[i])
// 				{
// 					GetToken();
// 					return;
// 				}
// 			}
// 			GetToken();
// 		}
// 	}
	Eat(t: token): void
	{
		if (this.tok != t)
			this.er.Report(errors.INTERNAL_COMPILER_STATE_ERROR, false, this.sfaTokBegin);
		this.GetToken();
		if (this.tok == token.tok_end)
			this.er.Report(errors.UNEXPECTED_EOF, false, this.sfaTokBegin);
	}
// 	// Eat optional token, returns true/false.
// 	bool EatOpt(token t)
// 	{
// 		if (tok != t)
// 			return false;
// 		GetToken();
// 		return true;
// 	}
    Expect(t: token, rep: string): void
	{
		if (this.CheckToken(t, rep))
			this.GetToken();
	}
	CheckToken(t: token, rep: string): boolean
	{
		if (this.tok != t)
		{
			if (this.tok == token.tok_end)
				this.er.Report(errors.UNEXPECTED_EOF, false, this.sfaTokBegin);
			else
                this.er.Report(errors.UNEXPECTED_TOKEN_EX, true, this.sfaTokBegin, this.lexer.GetTokenText(), rep);
			return false;
		}
		else
			return true;
	}
// 	bool CheckIdent(const wchar_t* ident)
// 	{
// 		if ((tok != tok_ident) || (lexer.GetTokenText() != ident))
// 		{
// 			if (tok == tok_end)
// 				er.Report(errors::UNEXPECTED_EOF, false, sfaTokBegin);
// 			else
// 				er.Report(errors::UNEXPECTED_TOKEN_EX, true, sfaTokBegin, lexer.GetTokenText(), ident);
// 			return false;
// 		}
// 		return true;
// 	}

// 	Types::AccessKind ParseOptionalAccess()
// 	{
// 		Types::AccessKind accessKind = Types::ak_none;
// 		switch (tok)
// 		{
// 		case tok_public:
// 			accessKind = Types::ak_public;
// 			GetToken();
// 			break;
// 		case tok_protected:
// 			accessKind = Types::ak_protected;
// 			GetToken();
// 			break;
// 		case tok_private:
// 			accessKind = Types::ak_private;
// 			GetToken();
// 			break;
// 		}
// 		return accessKind;
// 	}

// 	void ParseAttribute(std::vector<Ast::Attribute>& attributes);
// 	void ParseAttributes(std::vector<Ast::Attribute>& attributes);

// 	// A RecordNode (class/struct/etc) has a child RecordScopeNode representing {...}
// 	Ast::RecordScopeNode* ParseInterfaceScope();
// 	Ast::RecordScopeNode* ParseClassOrStructScope();

// 	Ast::RecordScopeNode* ParseCoclassScope();
// 	Ast::RecordScopeNode* ParseCointerfaceScope();
// 	Ast::RecordScopeNode* ParseWininterfaceScope();
// 	Ast::RecordScopeNode* ParseWinclassScope();
// 	Ast::RecordScopeNode* ParseWinstructScope();
// 	Ast::RecordScopeNode* ParseNamespaceScope();

// 	// Methods for parsing various names, symbols, and type names.
ParseUnqualifiedName() : string // Expects just a simple identifier and returns the text of it.
{
    var name : string;
	if (this.CheckToken(token.tok_ident, "<identifier>"))
		name = this.lexer.GetTokenText();
	else
		name = "error";
	this.GetToken();
	return name;
}

ParseQualifiedSymbol(): Node
{
//	assert((tok == tok_scoperes) || (tok == tok_ident));

    var node = this.CreateNode(AstKind.AST_SYMBOL, 0);
    var typeNode = this.CreateNode(AstKind.AST_SYMBOLTYPE);
//    node.typeNode = typeNode;
    node.AddChildNode(typeNode);

    var cnode: Node | null = null;

	if (this.tok != token.tok_scoperes) // ::
		cnode = this.ParseNameComponent();

    var tok = this.tok;
	while (tok == token.tok_scoperes)
	{
		if (cnode != null)
			typeNode.AddChildNode(cnode);
        this.GetToken();
        tok = this.tok;
		if (tok != token.tok_ident)
			this.er.Report(errors.EXPECTED_IDENTIFIER, true, this.sfaTokBegin, "");
		cnode = this.ParseNameComponent();
	}

    if (cnode != null)
    	node.AddChildNode(cnode);
	return node;
}
// 	Ast::SymbolNode* ParseUnqualifiedSymbol(); // Used in cases where a name cannot be qualified or have template args (e.g initclause)
ParseUnqualifiedNameNode(): Node	// simple identifier - used when naming defs and decls.  No template args
{
    var node = this.CreateNode(AstKind.AST_NAME, 0);
    node.name = this.ParseUnqualifiedName();
    return node;
}

ParseNameComponent() : Node // returns a NameNode consisting of just the name or with template args as children.
{
    var node  = this.ParseUnqualifiedNameNode();
	if (this.tok == token.tok_logicalnot) // !
	{
		this.GetToken();
//		node.AddChildNode(this.ParseTemplateArgs());
		node.AddChildNode(this.CreateErrorNode());
	}
	return node;	
}

// 	Ast::SymbolTypeNode* ParseSymbolType(); // a SymbolTypeNode holds onto a potentially fully-qualified typename.

// 	Ast::Node* ParseConstantNode();
ParseType() : Node
{
    return this.CreateErrorNode();
}
// 	Ast::Node* ParseOptReturnType();
// 	Ast::Node* ParseVar(Types::ScopeKind sk);
// 	Ast::Node* ParseProp();
// 	Ast::Node* ParseFuncDef(FuncDefType fdt);
// 	Ast::Node* ParseCtor();
// 	Ast::Node* ParseDtor();
// 	Ast::Node* ParseEnum();
// 	Ast::Node* ParseEnumItem();
// 	Ast::Node* ParseEnumScope();
// 	Ast::Node* ParseCofuncDef();
// 	Ast::Node* ParseInterfaceFuncDecl(); // only valid in interface or cointerface
// 	Ast::Node* ParseInterfaceCofuncDecl(); // only valid in interface or cointerface
// 	Ast::Node* ParseExternFuncDecl();
// 	Ast::Node* ParseParameters();
// 	Ast::Node* ParseParameter();
// 	Ast::Node* ParseTemplateArgs();
// 	Ast::Node* ParseTemplateArg();
// 	Ast::Node* ParseTemplateUnpackArg(); // parse unpack argument to a template
// 	Ast::Node* ParseTemplateParameters();
// 	Ast::Node* ParseTemplateParameter();
// 	Ast::Node* ParseTemplatePackArg();
// 	Ast::Node* ParseTemplateParameterType();
// 	Ast::Node* ParseInitList();
// 	Ast::Node* ParseInitclause();
// 	Ast::Node* ParseNamespace();
// 	Types::CallConv ParseOptCallConv();
// 	Ast::Node* ParseRecord(Ast::RecordNode* node, bool fTemplateAllowed = true);
// 	// Core native record types
// 	Ast::Node* ParseClass();
// 	Ast::Node* ParseInterface();
// 	Ast::Node* ParseStruct();
// 	// COM low-level types
// 	Ast::Node* ParseCoclass();
// 	Ast::Node* ParseCointerface();
// 	// WinRT high-level types.
// 	Ast::Node* ParseWinclass();
// 	Ast::Node* ParseWininterface();
// 	Ast::Node* ParseWinstruct();

// 	Ast::Node* ParseBaselist();
// 	Ast::Node* ParseInterfaceBaselist();
// 	Ast::Node* ParseCointerfaceBaselist();
// 	Ast::Node* ParseBase();
// 	Ast::Node* ParseInterfaceBase();
// 	Ast::Node* ParseImport();
// 	Ast::Node* ParseAsString();
// 	Ast::Node* ParsePragma();
// 	Ast::Node* ParseCodescope();
// 	Ast::Node* ParseStmt();
// 	Ast::Node* ParseOptStmt();
ParseFuncCallArgs(): Node
{
    var node = this.CreateNode(AstKind.AST_ARGUMENTS, 17);
	this.Eat(token.tok_lparen);

	while ((this.tok != token.tok_rparen) && (this.tok != token.tok_end))
	{
        var child = this.ParseCallArg();
		if (child == null)
			this.er.Report(errors.SYNTAX_ERROR, false, this.sfaTokBegin, this.lexer.GetTokenText());
        else
            node.AddChildNode(child);
		if (this.tok == token.tok_comma)
			this.GetToken();
	}

	this.Expect(token.tok_rparen, ")");
	return node;
}
// 	Ast::Node* ParseInitArgs();
// 	Ast::Node* ParseAssignInitArg();
    ParseNew(nodeLeft: Node | null): Node
    {
        return this.CreateErrorNode();
    }
    ParseDelete(nodeLeft: Node | null): Node
    {
        return this.CreateErrorNode();
    }
// 	Ast::Node* ParseTypecreate();
// 	Ast::Node* ParseTypedef();

// 	Ast::Node* ParseInit_exp();
// 	Ast::Node* ParseFor();
// 	Ast::Node* ParseIf();
// 	Ast::Node* ParseWhile();
// 	Ast::Node* ParseDo();
// 	Ast::Node* ParseReturn();
// 	Ast::Node* ParseBreak();
// 	Ast::Node* ParseContinue();

    ParseCast(kind: AstKind): Node
    {
        this.GetToken();
        //this.Expect(token.tok_lt, "<");
        var type = this.lexer.ScanToGreater();
        this.GetToken();
        this.Expect(token.tok_gt, ">");
        var node = this.CreateNode(kind, 2); // called from ParseExpr2
        node.name = type; // string version of type
        var args = this.ParseFuncCallArgs();
        node.AddChildNode(args);
        return node;
    }
    // ParseExpr# handles all of the 18 precedence levels
    ParseExpr0(): Node | null
    {
        var node: Node | null;
        switch(this.tok)
        {
        case token.tok_this:
            {
                var snode = this.CreateNode(AstKind.AST_SYMBOL, 0);
                snode.AddChildNode(this.CreateNode(AstKind.AST_SYMBOLTYPE));
                var thisnode = this.CreateNode(AstKind.AST_NAME);
                thisnode.name = "this";
                snode.AddChildNode(thisnode);
                node = snode;
                this.GetToken();
            }
            break;
        case token.tok_scoperes:
        case token.tok_ident:
            node = this.ParseQualifiedSymbol();
            break;
        case token.tok_integer:
            node = this.CreateConstantNode();
            this.GetToken();
            break;
        case token.tok_real:
            {
                var rnode = this.CreateNode(AstKind.AST_CONSTANTREAL, 0);
                rnode.name = this.lexer.GetTokenText();
                node = rnode;
                this.GetToken();
            }
            break;
        case token.tok_stringliteral:
            node = this.CreateNode(AstKind.AST_STRINGLIT, 0);
            node.name = this.lexer.GetTokenText();
            this.GetToken();
            break;
        case token.tok_charliteral:
            node = this.CreateNode(AstKind.AST_CHARLIT, 0);
            node.name = this.lexer.GetTokenText();
            this.GetToken();
            break;
        case token.tok_lparen:
            this.Eat(token.tok_lparen);
            node = this.ParseExpr();
            if (node != null)
                node.hasParens = true;
            this.Expect(token.tok_rparen, ")");
            break;
        case token.tok_true:
            node = this.CreateNode(AstKind.AST_BOOLLITERAL, 0);
            node.name = "true";
            this.GetToken();
            break;
        case token.tok_false:
            node = this.CreateNode(AstKind.AST_BOOLLITERAL, 0);
            node.name = "false";
            this.GetToken();
            break;
        case token.tok_nullptr:
            node = this.CreateNode(AstKind.AST_CONSTANT, 0);
            node.name = "nullptr";
            this.GetToken();
            break;
        default:
            node = null;
            break;
        }
        return node;
    }
    ParseExpr1(): Node | null
    {
        return this.ParseExpr0();
    }
    ParseExpr2(): Node | null
    {
        var nodeLeft = this.ParseExpr1();
        while (nodeLeft != null)
        {
            var fUnary: boolean = false;
            var node: Node | null = null;
            var nodeRight: Node | null = null;
            switch(this.tok)
            {
            case token.tok_lparen:
                node = this.CreateNode(AstKind.AST_FUNCTIONCALL, 2);
                nodeRight = this.ParseFuncCallArgs();
                break;
            case token.tok_lbracket:
                node = this.CreateNode(AstKind.AST_INDEX, 2);
                this.GetToken();
                nodeRight = this.ParseExpr();
                this.Expect(token.tok_rbracket, "]");
                break;
            case token.tok_dot:
                node = this.CreateNode(AstKind.AST_DOT, 2);
                this.GetToken();
                break;
            case token.tok_arrow:
                node = this.CreateNode(AstKind.AST_ARROW, 2);
                this.GetToken();
                break;
            case token.tok_plusplus:
                node = this.CreateNode(AstKind.AST_POSTINCR, 2);
                fUnary = true;
                this.GetToken();
                break;
            case token.tok_minusminus:
                node = this.CreateNode(AstKind.AST_POSTDECR, 2);
                this.GetToken();
                fUnary = true;
                break;
            default:
                return nodeLeft;
                break;
            }
            if (!fUnary && (nodeRight == null))
            {
                // node != nullptr
                nodeRight = this.ParseExpr1();
                if (nodeRight == null)
                    this.er.Report(errors.SYNTAX_ERROR, false, this.sfaTokBegin, this.lexer.GetTokenText());
            }
            if (fUnary)
                node.AddChildNode(nodeLeft);
            else
            {
                node.AddChildNode(nodeLeft);
                if (nodeRight != null)
                    node.AddChildNode(nodeRight);
            }
            nodeLeft = node;
        }
        switch (this.tok)
        {
        // TODO - typeid and xxx_cast operators...
        case token.tok_reinterpret_cast:
            nodeLeft = this.ParseCast(AstKind.AST_REINTERPRETCAST);
            break;
        case token.tok_const_cast:
            nodeLeft = this.ParseCast(AstKind.AST_CONSTCAST);
            break;
        case token.tok_dynamic_cast:
            nodeLeft = this.ParseCast(AstKind.AST_DYNAMICCAST);
            break;
        case token.tok_static_cast:
            nodeLeft = this.ParseCast(AstKind.AST_STATICCAST);
            break;
        }
        return nodeLeft;
    }
    ParseExpr3(): Node | null
    {
        // Not done () - C style cast...
        // Can't really do the c-style cast because we need to know what is a type.
        // e.g. (x), this could be cast to x if x is a type or not.

        var nodeLeft = this.ParseExpr2();
        // These are all prefix operators, so we only go here if nodeLeft == nullptr...
        if (nodeLeft != null)
        {
            if (nodeLeft.hasParens && (nodeLeft.kind == AstKind.AST_SYMBOL))
            {
                // if just a symbol, treat as c-style cast
                var cast = this.CreateNode(AstKind.AST_CAST, 3);
                nodeLeft.hasParens = false;
                cast.AddChildNode(nodeLeft);
                node = cast;
            }
            else
                return nodeLeft;
        }
        else
        {
            /* Pre-fix unary operators. */
            var node: Node | null = null;
            switch (this.tok)
            {
            case token.tok_logicalnot:
                node = this.CreateNode(AstKind.AST_NOT, 3);
                this.GetToken();
                break;
            case token.tok_compl:
                node = this.CreateNode(AstKind.AST_BITNOT, 3);
                this.GetToken();
                break;
            case token.tok_plusplus:
                node = this.CreateNode(AstKind.AST_PREINCR, 3);
                this.GetToken();
                break;
            case token.tok_minusminus:
                node = this.CreateNode(AstKind.AST_PREDECR, 3);
                this.GetToken();
                break;
            case token.tok_minus:
                node = this.CreateNode(AstKind.AST_UMINUS, 3);
                this.GetToken();
                break;
            case token.tok_plus:
                node = this.CreateNode(AstKind.AST_PLUS, 3);
                this.GetToken();
                break;
            case token.tok_times:
                node = this.CreateNode(AstKind.AST_DEREF, 3);
                this.GetToken();
                break;
            case token.tok_at:
                node = this.CreateNode(AstKind.AST_VIEWDEREF, 3);
                this.GetToken();
                break;
            case token.tok_bitand:
                node = this.CreateNode(AstKind.AST_ADDRESS, 3);
                this.GetToken();
                break;
            case token.tok_new:
                return this.ParseNew(null);
            case token.tok_delete:
                return this.ParseDelete(null);
            case token.tok_sizeof:
                {
                    var snode = this.CreateNode(AstKind.AST_SIZEOFTYPE, 3);
                    this.GetToken();
                    this.Expect(token.tok_lparen, "(");
                    snode.AddChildNode(this.ParseType());
                    this.Expect(token.tok_rparen, ")");
                    return snode;
                }
                break;
            default:
                return null;
            }
        }
        //assert(node != nullptr); //???
        if (node == null)
            throw "assertion";
        // node != nullptr
        // associativity is right-to-left for these, so call self.
        var cnode = this.ParseExpr3();
        if (cnode == null)
            cnode = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, true);
        node.AddChildNode(cnode);
        return node;
    }
    ParseExpr4(): Node | null
    {
        // TODO
        // .*
        // ->*
        return this.ParseExpr3();
    }
    ParseExpr5(): Node | null
    {
        var nodeLeft = this.ParseExpr4();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_times:
                node = this.CreateNode(AstKind.AST_MULT, 5);
                this.GetToken();
                break;
            case token.tok_div:
                node = this.CreateNode(AstKind.AST_DIV, 5);
                this.GetToken();
                break;
            case token.tok_mod:
                node = this.CreateNode(AstKind.AST_REM, 5);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            // node != nullptr
            var nodeRight = this.ParseExpr4();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr6(): Node | null
    {
        var nodeLeft = this.ParseExpr5();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_plus:
                node = this.CreateNode(AstKind.AST_PLUS, 6);
                this.GetToken();
                break;
            case token.tok_minus:
                node = this.CreateNode(AstKind.AST_MINUS, 6);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            // node != nullptr
            var nodeRight = this.ParseExpr5();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr7(): Node | null
    {
        return this.ParseExpr6();
        // Deal with >> and <<
        // These are not tokenized right now to allow templates to work better...
    }
    ParseExpr8(): Node | null
    {
        var nodeLeft = this.ParseExpr7();
        while (nodeLeft != null)
        {
            var kind: AstKind = AstKind.AST_EMPTY;
            switch(this.tok)
            {
            case token.tok_lt:
                kind = AstKind.AST_LT;
                break;
            case token.tok_ltequal:
                kind = AstKind.AST_LE;
                break;
            case token.tok_gt:
                kind = AstKind.AST_GT;
                break;
            case token.tok_gtequal:
                kind = AstKind.AST_GE;
                break;
            default:
                return nodeLeft;
                break;
            }
            var node = this.CreateNode(kind, 8);
            this.GetToken();
            // node != nullptr
            var nodeRight = this.ParseExpr7();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr9(): Node | null
    {
        var nodeLeft = this.ParseExpr8();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_equalequal:
                node = this.CreateNode(AstKind.AST_EQUALS, 9);
                this.GetToken();
                break;
            case token.tok_notequal:
                node = this.CreateNode(AstKind.AST_NE, 9);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            var nodeRight = this.ParseExpr8();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr10(): Node | null
    {
        var nodeLeft = this.ParseExpr9();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_bitand:
                node = this.CreateNode(AstKind.AST_BITAND, 10);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            var nodeRight = this.ParseExpr9();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr11(): Node | null
    {
        var nodeLeft = this.ParseExpr10();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_bitxor:
                node = this.CreateNode(AstKind.AST_XOR, 11);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            var nodeRight = this.ParseExpr10();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr12(): Node | null
    {
        var nodeLeft = this.ParseExpr11();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_bitor:
                node = this.CreateNode(AstKind.AST_BITOR, 12);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            var nodeRight = this.ParseExpr11();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr13(): Node | null
    {
        var nodeLeft = this.ParseExpr12();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_logicaland:
                node = this.CreateNode(AstKind.AST_AND, 13);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            var nodeRight = this.ParseExpr12();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr14(): Node | null
    {
        var nodeLeft = this.ParseExpr13();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_logicalor:
                node = this.CreateNode(AstKind.AST_OR, 14);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            var nodeRight = this.ParseExpr13();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr15(): Node | null
    {
        var nodeLeft = this.ParseExpr14();
        while (nodeLeft != null)
        {
            var node  = null;
            switch(this.tok)
            {
            case token.tok_ternary:
                node = this.CreateNode(AstKind.AST_QUESTION, 15);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            // node != nullptr
            // associativity is right-to-left for these, so call self.
            var nodeRight = this.ParseExpr16();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            this.Expect(token.tok_colon, ":");
            var nodeRight2 = this.ParseExpr16();
            if (nodeRight2 == null)
                nodeRight2 = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);

            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            node.AddChildNode(nodeRight2);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr16(): Node | null
    {
        var nodeLeft = this.ParseExpr15();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_equal:
                node = this.CreateNode(AstKind.AST_ASSIGN, 16);
                this.GetToken();
                break;
            case token.tok_timesequal:
                node = this.CreateNode(AstKind.AST_ASSIGNMULT, 16);
                this.GetToken();
                break;
            case token.tok_divequal:
                node = this.CreateNode(AstKind.AST_ASSIGNDIV, 16);
                this.GetToken();
                break;
            case token.tok_modequal:
                node = this.CreateNode(AstKind.AST_ASSIGNREM, 16);
                this.GetToken();
                break;
            case token.tok_plusequal:
                node = this.CreateNode(AstKind.AST_ASSIGNPLUS, 16);
                this.GetToken();
                break;
            case token.tok_minusequal:
                node = this.CreateNode(AstKind.AST_ASSIGNMINUS, 16);
                this.GetToken();
                break;
//                AST_ASSIGNLSHIFT,
//                AST_ASSIGNRSHIFT,
            case token.tok_bitandequal:
                node = this.CreateNode(AstKind.AST_ASSIGNAND, 16);
                this.GetToken();
                break;
            case token.tok_bitxorequal:
                node = this.CreateNode(AstKind.AST_ASSIGNXOR, 16);
                this.GetToken();
                break;
            case token.tok_bitorequal:
                node = this.CreateNode(AstKind.AST_ASSIGNOR, 16);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            // node != nullptr
            // associativity is right-to-left for these, so call self.
            var nodeRight = this.ParseExpr16();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr17(): Node | null
    {
        // TODO - throw
        return this.ParseExpr16();
    }
    ParseExpr18(): Node | null
    {
        var nodeLeft = this.ParseExpr17();
        while (nodeLeft != null)
        {
            var node = null;
            switch(this.tok)
            {
            case token.tok_comma:
                node = this.CreateNode(AstKind.AST_COMMA, 18);
                this.GetToken();
                break;
            default:
                return nodeLeft;
                break;
            }
            // node != nullptr
            var nodeRight = this.ParseExpr17();
            if (nodeRight == null)
                nodeRight = this.IssueErrorAndReturnErrorNode(errors.SYNTAX_ERROR, false);
            node.AddChildNode(nodeLeft);
            node.AddChildNode(nodeRight);
            nodeLeft = node;
        }
        return nodeLeft;
    }
    ParseExpr(): Node
    {
        var node = this.ParseExpr18();
        if (node == null)
            node = this.CreateErrorNode();
        return node;
    }

    CreateNode(kind: AstKind, level?: number) : Node
    {
        var node = new Node(kind);
        if (level)
            node.level = level;
        return node;
    }

    CreateErrorNode(): Node
    {
        var node = new Node(AstKind.AST_ERROR);
        return node;
    }
// 	Ast::Node* ParseOptExpr();
    ParseCallArg(): Node | null
    {
        return this.ParseExpr17(); // don't parse CommaNode
    }

	CreateConstantNode(): Node
	{
        var node = this.CreateNode(AstKind.AST_CONSTANT);
        node.name = this.lexer.GetTokenText();
//        node.value = this.lexer.GetConstantValue();
        return node;
	}

// 	Ast::Node* IssueErrorAndReturnErrorNode(Core::cperror err, bool fReturn, const std::wstring& strContext)
// 	{
// 		// If we got an error and we are at tok_end report EOF 
// 		if (tok == tok_end)
// 		{
// 			er.Report(errors::UNEXPECTED_EOF, false, sfaTokBegin);
// 			assert(false);
// 		}
// 		er.Report(err, fReturn, sfaTokBegin, strContext);
// 		// If we are returning, return an error node.
// 		return CreateNode<Ast::ErrorNode>();
// 	}
	IssueErrorAndReturnErrorNode(err: errors, fReturn: boolean): Node
	{
		// If we got an error and we are at tok_end report EOF 
		if (this.tok == token.tok_end)
		{
            this.er.Report(errors.UNEXPECTED_EOF, false, this.sfaTokBegin);
            throw "assertion";
//			assert(false);
		}
		this.er.Report(err, fReturn, this.sfaTokBegin);
		// If we are returning, return an error node.
		return this.CreateErrorNode();
	}
	// Parser(const Parser&);
	// Parser& operator=(const Parser&);
};

function needsParens(node: Node): boolean
{
    if (node.parentNode)
    {
        var parent: Node = node.parentNode;
        if (node.level > parent.level) // larger level is lower precedence
        {
            // We could disable parens above and below the "divide" line.
            // However, in practice it is nice to actually see the parens.
            // The following lines can be uncommented to hide them.
            // if (node.parentNode.kind == AstKind.AST_DIV)
            //     return false;
            return true;
        }
    }
    return false;
}


// Decide whether to wrap the first argument of pow in parens. If it is a 
// single identifier or a simple integer, then don't do it. Most everything else
// will benefit from parens.
function needsParensForPow(args: Node): boolean
{
    var arg : Node = args.children[0];
    switch (arg.kind)
    {
    case AstKind.AST_SYMBOL:
    case AstKind.AST_CONSTANT:
//    case AstKind.AST_CONSTANTREAL: // 2.5, 3.14159
//    case AstKind.AST_FUNCTIONCALL: // sin(x)
        return false;
    }
    return true;
}


//nodeToTexInvert will invert an operation if possible
function nodeToTexInvert(node: Node): string
{
    var out: string = "";
    switch (node.kind)
    {
    case AstKind.AST_EQUALS:
        out += nodeToTex(node.children[0]) + " \\neq " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_NE:
        out += nodeToTex(node.children[0]) + " = " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_LT:
        out += nodeToTex(node.children[0]) + " \\geq " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_LE:
        out += nodeToTex(node.children[0]) + " > " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_GT:
        out += nodeToTex(node.children[0]) + " \\leq " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_GE:
        out += nodeToTex(node.children[0]) + " < " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_NOT:
        out += nodeToTex(node.children[0]);
        break;
    default:
        // if (!node.hasParens)
        //     out += "not (" + nodeToTex(node) + ")";
        // else
            out += "\\text{not }" + nodeToTex(node);
        return out;
        break;
    }
    return out;
}

function nodeToTex(node: Node): string
{
    var out: string = "";
    switch (node.kind)
    {
    case AstKind.AST_DOT:
        out += nodeToTex(node.children[0]) + "\\texttt{.}" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ARROW:
        out += nodeToTex(node.children[0]) + "\\texttt{->}" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_NOT:
        out += "\\texttt{!}" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_DEREF:
        out += "*" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_COMMA:
        out += nodeToTex(node.children[0]) + " , " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_MULT:
        out += nodeToTex(node.children[0]) + " \\cdot " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_REM:
        out += nodeToTex(node.children[0]) + "\\bmod" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_DIV:
        out += "\\frac{" + nodeToTex(node.children[0]) + "}{" + nodeToTex(node.children[1]) + "}";
        break;
    case AstKind.AST_MINUS:
        out += nodeToTex(node.children[0]) + " - " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_PLUS:
        out += nodeToTex(node.children[0]) + " + " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_XOR:
        out += nodeToTex(node.children[0]) + " XOR " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGN:
        out += nodeToTex(node.children[0]) + " = " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_EQUALS:
        out += nodeToTex(node.children[0]) + " \\equiv " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_NE:
        out += nodeToTex(node.children[0]) + " \\neq " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_LT:
        out += nodeToTex(node.children[0]) + " < " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_LE:
        out += nodeToTex(node.children[0]) + " \\leq " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_GT:
        out += nodeToTex(node.children[0]) + " > " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_GE:
        out += nodeToTex(node.children[0]) + " \\geq " + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_BITAND:
        out += nodeToTex(node.children[0]) + "\\texttt{ & }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_BITNOT:
        out += "\\texttt{~}" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_BITOR:
        out += nodeToTex(node.children[0]) + "\\texttt{ | }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_AND:
        out += nodeToTex(node.children[0]) + "\\texttt{ && }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_OR:
        out += nodeToTex(node.children[0]) + "\\texttt{ || }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_LSHIFT:
        out += nodeToTex(node.children[0]) + "\\texttt{ << }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_RSHIFT:
        out += nodeToTex(node.children[0]) + "\\texttt{ >> }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNMULT:
        out += nodeToTex(node.children[0]) + "\\texttt{ *= }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNDIV:
        out += nodeToTex(node.children[0]) + "\\texttt{ /= }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNREM:
        out += nodeToTex(node.children[0]) + "\\texttt{ %= }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNPLUS:
        out += nodeToTex(node.children[0]) + "\\texttt{ += }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNMINUS:
        out += nodeToTex(node.children[0]) + "\\texttt{ -= }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNLSHIFT:
        out += nodeToTex(node.children[0]) + "\\texttt{ <<= }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNRSHIFT:
        out += nodeToTex(node.children[0]) + "\\texttt{ >>= }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNAND:
        out += nodeToTex(node.children[0]) + "\\texttt{ &= }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNXOR:
        out += nodeToTex(node.children[0]) + "\\texttt{ ^= }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_ASSIGNOR:
        out += nodeToTex(node.children[0]) + "\\texttt{ |= }" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_INDEX:
        {
            var temp: string = "";
            var index = node;
            var addComma = false;
            while (index != null)
            {
                if (index.kind == AstKind.AST_INDEX) // keep going
                {
                    if (addComma)
                        temp = nodeToTex(index.children[1]) + "," + temp;
                    else
                        temp = nodeToTex(index.children[1]) + temp;
                    addComma = true;
                    index = index.children[0];
                }
                else
                {
                    temp = nodeToTex(index) + "_{" + temp + "}";
                    break;
                }
            }
        }
        out += temp;
        break;
    case AstKind.AST_UMINUS:
        out += "-" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_PREDECR:
        out += "\\texttt{--}" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_POSTDECR:
        out += nodeToTex(node.children[0]) + "\\texttt{--}";
        break;
    case AstKind.AST_PREINCR:
        out += "\\texttt{++}" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_POSTINCR:
        out += nodeToTex(node.children[0]) + "\\texttt{++}";
        break;
    case AstKind.AST_CONSTANT:
    case AstKind.AST_CONSTANTREAL:
    case AstKind.AST_BOOLLITERAL:
        out += node.name;
        break;
    case AstKind.AST_STRINGLIT:
        out += "\\texttt{\"" + node.name + "\"}";
        break;
    case AstKind.AST_CHARLIT:
        out += "\\texttt{'" + node.name + "'}";
        break;

    // I had to create three \\texttt blocks, rather than just one. Not sure why...
    case AstKind.AST_REINTERPRETCAST:
        out += "\\texttt{reinterpret_cast<}\\texttt{" + node.name + "}\\texttt{>}" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_CONSTCAST:
        out += "\\texttt{const_cast<}\\texttt{" + node.name + "}\\texttt{>}" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_STATICCAST:
        out += "\\texttt{static_cast<}\\texttt{" + node.name + "}\\texttt{>}" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_DYNAMICCAST:
        out += "\\texttt{dynamic_cast<}\\texttt{" + node.name + "}\\texttt{>}" + nodeToTex(node.children[0]);
        break;
    case AstKind.AST_CAST:
        out += "\\texttt{(}" + nodeToTex(node.children[0]) + "\\texttt{)}" + nodeToTex(node.children[1]);
        break;
    case AstKind.AST_QUESTION:
        out += 
            "\\begin{cases}" + 
                nodeToTex(node.children[1]) + ",  & \\text{if }" + nodeToTex(node.children[0]) +
                "\\\\" + 
                nodeToTex(node.children[2]) + ",  & \\text{if }" + nodeToTexInvert(node.children[0]) +
            "\\end{cases}";
        break;
    case AstKind.AST_ARGUMENTS:
        {
            var insertComma: boolean = false;
            for(var i = 0;i<node.children.length;i++)
            { 
                if (insertComma)
                    out += ", ";
                out += nodeToTex(node.children[i]);
                insertComma = true;
            }
        }
        break;
    case AstKind.AST_FUNCTIONCALL:
        {
            var call: string = nodeToTex(node.children[0]);
            var args = node.children[1];
            switch (call)
            {
            case "\\mathit{sqrt}":
                out += "\\sqrt{" + nodeToTex(args.children[0]) + "}";
                break;
            case "\\mathit{abs}":
            case "\\mathit{fabs}":
                out += "{\\mid" + nodeToTex(args.children[0]) + "\\mid}";
                break;
            case "\\mathit{pow}":
                if (needsParensForPow(args))
                    out += "{(" + nodeToTex(args.children[0]) + ")}^{" + nodeToTex(args.children[1]) + "}";
                else
                    out += "{" + nodeToTex(args.children[0]) + "}^{" + nodeToTex(args.children[1]) + "}";
                break;
            case "\\mathit{sin}":
                out += "\\sin {" + nodeToTex(args) + "}";
                break;
            case "\\mathit{sinh}":
                out += "\\sinh {" + nodeToTex(args) + "}";
                break;
            case "\\mathit{cos}":
                out += "\\cos {" + nodeToTex(args) + "}";
                break;
            case "\\mathit{cosh}":
                out += "\\cosh {" + nodeToTex(args) + "}";
                break;
            case "\\mathit{tan}":
                out += "\\tan {" + nodeToTex(args) + "}";
                break;
            case "\\mathit{tanh}":
                out += "\\tanh {" + nodeToTex(args) + "}";
                break;
            case "\\mathit{asin}":
                out += "\\arcsin {" + nodeToTex(args)+ "}";
                break;
            case "\\mathit{acos}":
                out += "\\arccos {" + nodeToTex(args)+ "}";
                break;
            case "\\mathit{atan}":
                out += "\\arctan {" + nodeToTex(args)+ "}";
                break;
            case "\\mathit{log}":
                out += "\\ln {";
                out += nodeToTex(args);
                out += "}";
                break;
            case "\\mathit{log10}":
                out += "\\log_{10} {";
                out += nodeToTex(args);
                out += "}";
                break;
            default:
                out += call + nodeToTex(args);
                break;
            }
        }
        break;
    case AstKind.AST_ERROR:
//        out += "<error>";
        break;
    case AstKind.AST_SYMBOL:
        {
            var insertScope: boolean = false;
            var name = node.children[1]; // name node
            var output: string = "";
            while(name != null)
            {
                if (insertScope)
                    output += "::";
                output += name.name;
                insertScope = true;
                name = name.children[0];
            }
            // underscores do subscripts so replace them with escape
            output = output.replace(/_/g, "\\_");
            switch (output)
            {
            case "alpha":
            case "beta":
            case "gamma":
            case "delta":
            case "epsilon":
            case "zeta":
            case "eta":
            case "theta":
            case "iota":
            case "kappa":
            case "lambda":
            case "mu":
            case "nu":
            case "xi":
            case "o":
            case "pi":
            case "rho":
            case "sigma":
            case "tau":
            case "upsilon":
            case "phi":
            case "chi":
            case "psi":
            case "omega":
                output = "\\" + output;
                break;
            default:
                // wrap whole name in italics
                output = "\\mathit{" + output + "}";
                break;
            }
            out += output;
        }
        break;
    default:
        out += "\\text{failed(astkind:" + node.kind + ")}";
        break;
    }
    // if (node.hasParens)
    //     return "{(" + out + ")}";
    if (needsParens(node))
        return "(" + out + ")";
    return out;
}

function parseExpressions(text : string) : string
{
    var reader: Reader = new Reader(text);
    var er: ErrorReporter = new ErrorReporter();
    var lexer: Lexer = new Lexer(er, reader);
    var parser: Parser = new Parser(er, lexer);
    var out: string = "";

    parser.GetToken();
    var addSpace: boolean = false;
    while (parser.tok != token.tok_end)
    {
        if (parser.tok == token.tok_semicolon)
        {
            parser.GetToken();
            out += "\\\\"; // new line
            addSpace = false;
            continue;
        }
        var node = parser.ParseExpr();
        if (node.kind == AstKind.AST_ERROR)
        {
            parser.GetToken();
            // out += "\\\\"; // new line
            // addSpace = false;
            continue;
        }
        if (addSpace)
            out += "\\texttt{ }";
        addSpace = true;
        out += nodeToTex(node);
    }

    return out;
}

function getWebviewContent(output: string) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>MathJax example</title>
  <script type="text/javascript" async
  src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/latest.js?config=TeX-MML-AM_CHTML" async>
</script>
</head>
<body>` +
`<p>$$` + output +`$$</p>` +
`</body>
</html>`;
}

function getWebviewContentDebug(text: string, tokens: string, output: string) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>MathJax example</title>
  <script type="text/javascript" async
  src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/latest.js?config=TeX-MML-AM_CHTML" async>
</script>
</head>
<body>` +
`<p>Original text: ` + text + `</p>` +
`<p>Tex: ` + tokens + `</p>` +
`<p>$$` + output +`$$</p>` +
`</body>
</html>`;
}

// this method is called when your extension is deactivated
export function deactivate() {
}
