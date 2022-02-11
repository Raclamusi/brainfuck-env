"use strict";

document.addEventListener("DOMContentLoaded", _event => {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        mode: "brainfuck",
        lineNumbers: true,
        indentUnit: 4,
    });
});
