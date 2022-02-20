"use strict";

document.addEventListener("DOMContentLoaded", _event => {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        mode: "brainfuck",
        lineNumbers: true,
        tabSize: 4,
        indentUnit: 4,
        indentWithTabs: true,
        matchBrackets: true,
        autoCloseBrackets: true,
    });
});
