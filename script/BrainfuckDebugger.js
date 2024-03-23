"use strict";

/**
 * @typedef {Object} BrainfuckNode
 * @property {BrainfuckNodeType} type
 * @property {number} value
 * @property {CodeMirror.TextMarker} marker
 */

class BrainfuckDebugger {
    /** @type {CodeMirror.Editor} */
    #editor;
    /** @type {Scanner} */
    #scanner;
    /** @type {Printer} */
    #printer;
    /** @type {MemoryDebugger} */
    #memory;
    /** @type {HTMLSpanElement} */
    #statusSpan;
    /** @type {BrainfuckNode[]} */
    #nodes;

    /**
     * @param {CodeMirror.Editor} editor 
     * @param {Scanner} scanner 
     * @param {Printer} printer 
     * @param {MemoryDebugger} memory 
     * @param {HTMLSpanElement} statusSpan 
     */
    constructor(editor, scanner, printer, memory, statusSpan) {
        this.#editor = editor;
        this.#scanner = scanner;
        this.#printer = printer;
        this.#memory = memory;
        this.#statusSpan = statusSpan;
        this.#nodes = [];
    }

    #reset() {
        this.#scanner.reset();
        this.#printer.reset();
        this.#memory.reset();
    }

    /**
     * @param {BrainfuckNode} node 
     */
    #markNode(node) {
        const { from, to } = node.marker.find();
        this.#editor.scrollIntoView({ from, to });
        return this.#editor.markText(from, to, { className: "debug_editor_marker" });
    }

    #compile() {
        this.#nodes = [];
        for (const marker of this.#editor.getAllMarks()) {
            marker.clear();
        }

        const pushNode = (type, value, from, to) => {
            this.#nodes.push({ type, value, marker: this.#editor.markText(from, to) });
        };

        let error = "";
        const addError = (line, ch, text) => {
            const lineNum = `${line + 1}`.padStart(4);
            const lineText = this.#editor.getLine(line);
            error += `\x1b[1m${line + 1}:${ch + 1}: \x1b[31merror: \x1b[39m${text}\x1b[22m\n`;
            error += ` ${lineNum} | ${lineText}\n`;
            error += ` ${" ".repeat(lineNum.length)} | \x1b[32m${" ".repeat(ch)}^\x1b[39m\n`;
        };

        /** @type {BrainfuckNodeType} */
        let type = 0;
        let from = { line: 0, ch: 0 };
        let to = { line: 0, ch: 0 };
        let value = 0;
        const loopStack = [];
        const lineCount = this.#editor.lineCount();
        for (let line = 0; line < lineCount; ++line) {
            const text = this.#editor.getLine(line);
            for (let ch = 0; ch < text.length; ++ch) {
                const c = text[ch];

                // 認識しないコマンドは読み飛ばす
                if (!"><+-.,[]@".includes(c)) {
                    continue;
                }

                // 前のコマンドと同系統のコマンドである場合は、まとめて処理する
                if (type === BrainfuckNodeType.Advance) {
                    if ("><".includes(c)) {
                        to = { line, ch: ch + 1 };
                        if (c === ">") {
                            ++value;
                        }
                        else {
                            --value;
                        }
                        continue;
                    }
                }
                else if (type === BrainfuckNodeType.Add) {
                    if ("+-".includes(c)) {
                        to = { line, ch: ch + 1 };
                        if (c === "+") {
                            ++value;
                        }
                        else {
                            --value;
                        }
                        value %= 256;
                        continue;
                    }
                }

                // ノードを追加する
                if (type) {
                    pushNode(type, value, from, to);
                }

                // 各コマンドの処理
                from = { line, ch };
                to = { line, ch: ch + 1 };
                if (c === ">") {
                    type = BrainfuckNodeType.Advance;
                    value = 1;
                }
                else if (c === "<") {
                    type = BrainfuckNodeType.Advance;
                    value = -1;
                }
                else if (c === "+") {
                    type = BrainfuckNodeType.Add;
                    value = 1;
                }
                else if (c === "-") {
                    type = BrainfuckNodeType.Add;
                    value = -1;
                }
                else if (c === ".") {
                    type = BrainfuckNodeType.Output;
                    value = 0;
                }
                else if (c === ",") {
                    type = BrainfuckNodeType.Input;
                    value = 0;
                }
                else if (c === "[") {
                    type = BrainfuckNodeType.LoopBegin;
                    value = 0;
                    loopStack.push(this.#nodes.length);
                }
                else if (c === "]") {
                    type = BrainfuckNodeType.LoopEnd;
                    if (loopStack.length) {
                        value = loopStack.pop();
                        this.#nodes[value].value = this.#nodes.length;
                    }
                    else {
                        addError(line, ch, "unmatched ']'");
                    }
                }
                else if (c === "@") {
                    type = BrainfuckNodeType.Break;
                    value = 0;
                }
            }
        }
        if (type) {
            pushNode(type, value, from, to);
        }
        for (const i of loopStack) {
            const { line, ch } = this.#nodes[i].marker.find().from;
            addError(line, ch, "unmatched '['");
        }

        return error;
    }

    #runtimeError(message) {
        if (!this.#printer.isNewLine()) {
            this.#printer.put(Printer.LF);
        }
        this.#printer.println(`\x1b[;31mruntime error: ${message}\x1b[m`);
        this.#statusSpan.textContent = "実行時エラー";
        this.#statusSpan.style.color = "red";
    }

    async start() {
    }

    async startSync() {
        this.#reset();
        const error = this.#compile();
        if (error) {
            this.#printer.print(error);
            this.#statusSpan.textContent = "コンパイルエラー";
            this.#statusSpan.style.color = "red";
            return;
        }

        try {
            this.#memory.setUpdateState(false);
            const echo = load("echo");
            const startTime = performance.now();
            for (let pc = 0; pc < this.#nodes.length; ++pc) {
                const { type, value } = this.#nodes[pc];
                if (type === BrainfuckNodeType.Advance) {
                    this.#memory.advanceUnchecked(value);
                }
                else if (type === BrainfuckNodeType.Add) {
                    this.#memory.addUnchecked(value);
                }
                else if (type === BrainfuckNodeType.Output) {
                    this.#printer.put(this.#memory.get());
                }
                else if (type === BrainfuckNodeType.Input) {
                    const c = this.#scanner.get();
                    this.#memory.set(c);
                    if (echo) {
                        this.#printer.put(c);
                    }
                }
                else if (type === BrainfuckNodeType.LoopBegin) {
                    if (this.#memory.get() === 0) {
                        pc = value;
                    }
                }
                else if (type === BrainfuckNodeType.LoopEnd) {
                    if (this.#memory.get() !== 0) {
                        pc = value;
                    }
                }
            }
            const endTime = performance.now();
            this.#memory.update();
            this.#printer.flush();
            this.#statusSpan.textContent = `実行完了 (${Math.round(endTime - startTime)} ms)`;
            this.#statusSpan.style.color = "";
        }
        catch (e) {
            if (e instanceof BrainfuckError) {
                this.#runtimeError(e.message);
            }
        }
        finally {
            this.#memory.setUpdateState(true);
        }
    }

    pause() {

    }

    restart() {

    }

    stop() {
        
    }

    step() {

    }

    until() {

    }
}
