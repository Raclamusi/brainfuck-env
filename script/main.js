"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // エディタ、入出力
    const editorCopy = document.getElementById("editor_copy");
    const editorTextarea = document.getElementById("editor");
    const inputOuter = document.getElementById("input_outer");
    const inputCopy = document.getElementById("input_copy");
    const input = document.getElementById("input");
    const outputOuter = document.getElementById("output_outer");
    const outputCopy = document.getElementById("output_copy");
    const output = document.getElementById("output");
    const ibuffer = document.getElementById("ibuffer");

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
    const untilButton = document.getElementById("until");
    const debugStatus = document.getElementById("status");

    // メモリ
    const pointer = document.getElementById("pointer");
    const memoryAutoScroll = document.getElementById("memory_autoscroll");
    const memoryExpand = document.getElementById("memory_expand");
    const memlines = document.getElementById("memlines");
    const memcells = document.getElementById("memcells");

    // 共有
    const shareButton = document.getElementById("share_button");


    // 初期設定
    if (!load("initialized")) {
        save("initialized", true);
        save("editor", "");
        save("input", "");
        save("inputopen", true);
        save("outputopen", true);
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
    });
    editor.setValue(load("editor"));
    editor.on("change", (_, change) => {
        if (load("indent") === "space" && change.origin === "+input" && change.text[0] === "\t") {
            const inc = pos => ({ line: pos.line, ch: pos.ch + 1 });
            editor.getDoc().replaceRange(" ".repeat(load("indentsize")), change.from, inc(change.from));
        }
    });

    // 入出力の設定
    input.value = load("input");
    inputOuter.open = load("inputopen");
    outputOuter.open = load("outputopen");
    input.style.tabSize = load("tabsize");
    output.style.tabSize = load("tabsize");
    const scanner = new Scanner(input, ibuffer, load("eof"));
    const printer = new Printer(output);
    
    // エディター、入力の保存
    let saveId = null;
    const saveEditors = () => {
        save("editor", editor.getValue());
        save("input", input.value);
        save("inputopen", inputOuter.open);
        save("outputopen", outputOuter.open);
        clearTimeout(saveId);
        saveId = null;
    };
    const requestSave = () => {
        if (saveId === null) {
            saveId = setTimeout(saveEditors, 10000);
        }
    };
    editor.on("change", requestSave);
    input.addEventListener("input", requestSave);
    inputOuter.addEventListener("toggle", requestSave);
    outputOuter.addEventListener("toggle", requestSave);

    // コピーボタンの設定
    editorCopy.addEventListener("click", () => writeToClipboard(editor.getValue()));
    inputCopy.addEventListener("click", () => writeToClipboard(input.value));
    outputCopy.addEventListener("click", () => writeToClipboard(output.textContent));

    // 設定の設定
    optionEof.addEventListener("change", event => {
        const value = event.target.value === "0" ? 0 : 255;
        save("eof", value);
        scanner.eof = value;
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

    // メモリの設定
    const memory = new MemoryDebugger(memcells, memlines, pointer, memoryAutoScroll, memoryExpand);
    const memoryMarker = new MemoryMarker(memcells);

    // デバッグの設定
    const bfDebugger = new BrainfuckDebugger(editor, scanner, printer, memory, memoryMarker, debugStatus);
    const changeToStart = () => {
        runButton.textContent = "実行";
        runButton.classList.remove("pause");
        runButton.classList.add("run");
    };
    const changeToPause = () => {
        runButton.textContent = "停止";
        runButton.classList.remove("run");
        runButton.classList.add("pause");
    };
    const changeToResume = () => {
        runButton.textContent = "再開";
        runButton.classList.remove("pause");
        runButton.classList.add("run");
    };
    bfDebugger.setFunctionOnPause(changeToResume);
    bfDebugger.setFunctionOnResume(changeToPause);
    bfDebugger.setFunctionOnFinish(changeToStart);
    runButton.addEventListener("click", () => {
        switch (runButton.textContent) {
            case "実行":
                saveEditors();
                bfDebugger.start();
                break;
            case "停止":
                bfDebugger.pause();
                break;
            case "再開":
                bfDebugger.resume();
                break;
            default:
                changeToStart();
                break;
        }
    });
    stopButton.addEventListener("click", () => {
        bfDebugger.stop();
    });
    nodebugButton.addEventListener("click", () => {
        saveEditors();
        bfDebugger.startSync();
    });
    stepButton.addEventListener("click", () => {
        bfDebugger.step();
    });
    untilButton.addEventListener("click", () => {
        bfDebugger.until();
    });

    // 共有の設定
    const shareId = getShareID();
    if (shareId) {
        saveId = 0;
        editor.setValue("Getting shared content...");
        editor.setOption("readOnly", true);
        input.value = "Getting shared content...";
        input.setAttribute("readonly", "");
        shareButton.setAttribute("disabled", "");
        (async () => {
            try {
                const { code, input: inputText, error } = await getSharedContent(shareId);
                if (error) {
                    console.error(`share: ${error}`);
                }
                else {
                    editor.setValue(code ?? "");
                    input.value = inputText ?? "";
                }
            }
            finally {
                editor.setOption("readOnly", false);
                input.removeAttribute("readonly");
                shareButton.removeAttribute("disabled");
                saveId = null;
            }
        })();
    }
    shareButton.addEventListener("click", () => {
        shareButton.setAttribute("disabled", "");
        saveEditors();
        const code = editor.getValue();
        const inputText = input.value;
        (async () => {
            try {
                const { id, error } = await shareContent(code, inputText);
                if (error) {
                    console.error(`share: ${error}`);
                }
                else {
                    const url = new URL(location.href);
                    url.searchParams.set("share", id);
                    history.replaceState(null, "", url);
                }
            }
            finally {
                shareButton.removeAttribute("disabled");
            }
        })();
    });
});
