"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // エディタ、入出力
    const editorCopy = document.getElementById("editor_copy");
    const editorTextarea = document.getElementById("editor");
    const inputCopy = document.getElementById("input_copy");
    const input = document.getElementById("input");
    const outputCopy = document.getElementById("output_copy");
    const output = document.getElementById("output");

    // 設定
    const optionEof = document.getElementById("option_eof");
    const optionIndent = document.getElementById("option_indent");
    const optionIndentSize = document.getElementById("option_indentsize");
    const optionTabSize = document.getElementById("option_tabsize");
    const optionEcho = document.getElementById("option_echo");

    // デバッグ
    const runButton = document.getElementById("run");
    const stopButton = document.getElementById("stop");
    const nodebugButton = document.getElementById("nodebug");
    const stepButton = document.getElementById("step");
    const nextButton = document.getElementById("next");
    const finishButton = document.getElementById("finish");
    const untilButton = document.getElementById("until");
    const previousButton = document.getElementById("previous");
    const macroButton = document.getElementById("macro");

    // メモリ
    const memory = document.getElementById("memory");
    const pointer = document.getElementById("pointer");
    const memoryAutoScroll = document.getElementById("memory_autoscroll");


    // 初期設定
    if (!load("initialized")) {
        save("initialized", true);
        save("editor", "");
        save("input", "");
        save("eof", 255);
        save("indent", "tab");
        save("indentsize", 4);
        save("tabsize", 4);
        save("echo", true);
    }

    // エディタの設定
    const editor = CodeMirror.fromTextArea(editorTextarea, {
        mode: "brainfuck",
        lineNumbers: true,
        tabSize: load("tabsize"),
        indentUnit: load("indentsize"),
        indentWithTabs: load("indent") !== "space",
        matchBrackets: true,
        autoCloseBrackets: true,
        value: load("editor"),
    });
    editor.on("change", (_, change) => {
        if (load("indent") === "space" && change.origin === "+input" && change.text[0] === "\t") {
            const inc = pos => ({ line: pos.line, ch: pos.ch + 1 });
            editor.getDoc().replaceRange(" ".repeat(load("indentsize")), change.from, inc(change.from));
        }
    });

    // 入出力の設定
    input.style.tabSize = load("tabsize");
    output.style.tabSize = load("tabsize");

    // コピーボタンの設定
    editorCopy.addEventListener("click", () => writeToClipboard(editor.getValue()));
    inputCopy.addEventListener("click", () => writeToClipboard(input.value));
    outputCopy.addEventListener("click", () => writeToClipboard(output.textContent));

    // 設定の設定
    optionEof.addEventListener("change", event => {
        save("eof", event.target.value === "0" ? 0 : 255);
    });
    optionIndent.addEventListener("change", event => {
        save("indent", event.target.value);
        editor.setOption("indentWithTabs", event.target.value !== "space");
    });
    optionIndentSize.addEventListener("change", event => {
        const value = parseInt(event.target.value);
        save("indentsize", value);
        editor.setOption("indentUnit", value);
    });
    optionTabSize.addEventListener("change", event => {
        const value = parseInt(event.target.value);
        save("tabsize", value);
        editor.setOption("tabSize", value);
        input.style.tabSize = value;
        output.style.tabSize = value;
    });
    optionEcho.addEventListener("change", event => {
        save("echo", event.target.value === "valid");
    });
    optionEof.value = load("eof");
    optionIndent.value = load("indent");
    optionIndentSize.value = load("indentsize");
    optionTabSize.value = load("tabsize");
    optionEcho.value = load("echo") ? "valid" : "invalid";

    // デバッグの設定


    // メモリの設定

});
