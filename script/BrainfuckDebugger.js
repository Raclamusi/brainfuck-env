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

    #isRunning = false;
    #currentLoopDepth = 0;
    #pauseLoopDepth = -1;
    
    /** @type {() => void} */
    #onPause = null;
    /** @type {() => void} */
    #onResume = null;
    /** @type {() => void} */
    #onFinish = null;

    /** @type {() => void} */
    #resolvePause = null;
    /** @type {() => void} */
    #resolveResume = null;
    /** @type {() => void} */
    #resolveStop = null;

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
     * @param {CodeMirror.TextMarker} marker 
     */
    #markNode(marker) {
        const { from, to } = marker.find();
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
        if (this.#isRunning) {
            return;
        }

        this.#reset();
        const error = this.#compile();
        if (error) {
            this.#printer.print(error);
            this.#statusSpan.textContent = "コンパイルエラー";
            this.#statusSpan.style.color = "red";
            return;
        }

        try {
            this.#isRunning = true;
            this.#currentLoopDepth = 0;
            this.#statusSpan.style.color = "";
            if (this.#onResume) {
                this.#onResume();
            }

            this.#memory.setUpdateState(false);
            const echo = load("echo");
            const yieldStep = 2_000_000;
            let insns = yieldStep;
            let elapsedTime = 0;
            let startTime = performance.now();
            for (let pc = 0; pc < this.#nodes.length; ++pc, ++insns) {
                if (this.#resolveStop) {
                    this.#resolveStop();
                    this.#resolveStop = null;
                    break;
                }
                const { type, value, marker } = this.#nodes[pc];
                if ((this.#resolvePause && this.#pauseLoopDepth < 0) || type === BrainfuckNodeType.Break) {
                    elapsedTime += performance.now() - startTime;
                    if (this.#resolvePause) {
                        this.#resolvePause();
                        this.#resolvePause = null;
                    }
                    this.#statusSpan.textContent = `停止中 (${Math.floor(elapsedTime)} ms)`;
                    this.#memory.update();
                    this.#printer.flush();
                    this.#memory.setUpdateState(true);
                    if (this.#onPause) {
                        this.#onPause();
                    }
                    const markedMarker = this.#markNode(marker);
                    await new Promise(resolve => {
                        this.#resolveResume = resolve;
                    });
                    markedMarker.clear();
                    this.#statusSpan.textContent = `実行中 (${Math.floor(elapsedTime)} ms)`;
                    this.#memory.setUpdateState(false);
                    if (this.#onResume) {
                        this.#onResume();
                    }
                    startTime = performance.now();
                }
                else if (insns >= yieldStep) {
                    insns = 0;
                    this.#statusSpan.textContent = `実行中 (${Math.floor(elapsedTime + (performance.now() - startTime))} ms)`;
                    this.#memory.update();
                    this.#printer.flush();
                    await sleep(0);
                }
                if (type === BrainfuckNodeType.Advance) {
                    this.#memory.advance(value);
                }
                else if (type === BrainfuckNodeType.Add) {
                    this.#memory.add(value);
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
                    else {
                        ++this.#currentLoopDepth;
                    }
                }
                else if (type === BrainfuckNodeType.LoopEnd) {
                    if (this.#memory.get() !== 0) {
                        pc = value;
                    }
                    else {
                        --this.#currentLoopDepth;
                        if (this.#currentLoopDepth === this.#pauseLoopDepth) {
                            this.#pauseLoopDepth = -1;
                        }
                    }
                }
            }
            elapsedTime += performance.now() - startTime;
            this.#statusSpan.textContent = `実行完了 (${Math.floor(elapsedTime)} ms)`;
            this.#statusSpan.style.color = "";
        }
        catch (e) {
            if (e instanceof BrainfuckError) {
                this.#runtimeError(e.message);
            }
        }
        finally {
            this.#isRunning = false;
            this.#pauseLoopDepth = -1;
            if (this.#resolvePause) {
                this.#resolvePause();
                this.#resolvePause = null;
            }
            if (this.#resolveResume) {
                this.#resolveResume();
                this.#resolveResume = null;
            }
            if (this.#resolveStop) {
                this.#resolveStop();
                this.#resolveStop = null;
            }
            this.#memory.update();
            this.#memory.setUpdateState(true);
            if (this.#onFinish) {
                this.#onFinish();
            }
        }
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
            this.#printer.flush();
            this.#statusSpan.textContent = `実行完了 (${Math.floor(endTime - startTime)} ms)`;
            this.#statusSpan.style.color = "";
        }
        catch (e) {
            if (e instanceof BrainfuckError) {
                this.#runtimeError(e.message);
            }
        }
        finally {
            this.#memory.update();
            this.#memory.setUpdateState(true);
        }
    }

    async pause() {
        if (this.#resolvePause || this.#resolveStop) {
            return;
        }
        await new Promise(resolve => {
            this.#resolvePause = resolve;
        });
    }

    resume() {
        if (!this.#resolveResume || this.#resolveStop) {
            return;
        }
        this.#resolveResume();
        this.#resolveResume = null;
    }

    async stop() {
        if (!this.#isRunning || this.#resolveStop) {
            return;
        }
        if (this.#resolvePause) {
            this.#resolvePause();
            this.#resolvePause = null;
        }
        if (this.#resolveResume) {
            this.#resolveResume();
            this.#resolveResume = null;
        }
        await new Promise(resolve => {
            this.#resolveStop = resolve;
        });
    }

    async step() {
        if (this.#isRunning) {
            if (this.#resolvePause || !this.#resolveResume || this.#resolveStop) {
                return;
            }
            const promise = this.pause();
            this.resume();
            await promise;
        }
        else {
            const promise = this.pause();
            this.start();
            await promise;
        }
    }

    async until() {
        if (!this.#isRunning || this.#resolvePause || !this.#resolveResume || this.#resolveStop) {
            return;
        }
        this.#pauseLoopDepth = this.#currentLoopDepth - 1;
        const promise = this.pause();
        this.resume();
        await promise;
    }

    isRunning() {
        return this.#isRunning;
    }

    isInPause() {
        return this.#resolveResume != null;
    }

    /** @param {() => void} func */
    setFunctionOnPause(func) {
        this.#onPause = func;
    }

    /** @param {() => void} func */
    setFunctionOnResume(func) {
        this.#onResume = func;
    }
    
    /** @param {() => void} func */
    setFunctionOnFinish(func) {
        this.#onFinish = func;
    }
}
