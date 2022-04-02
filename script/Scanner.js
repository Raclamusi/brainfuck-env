"use strict";

class Scanner {
    /** @type {HTMLTextAreaElement} */
    #textarea;
    /** @type {MemoryEditor} */
    #editor;
    /** @type {number} */
    #eof;

    /**
     * @param {HTMLTextAreaElement} textarea
     * @param {HTMLDivElement} bufferDiv
     */
    constructor(textarea, bufferDiv, eof = 255) {
        this.#textarea = textarea;
        this.#editor = new MemoryEditor([], bufferDiv);
        this.#editor.setFunctionToExpandMemory(() => {
            this.#editor.memory.push(0);
            this.#editor.pushSpan();
        });
        this.eof = eof;
    }

    reset() {
        this.#editor.memory = encodeUTF8(this.#textarea.value);
        this.#editor.resetDiv(true);
        this.#editor.pushSpan();
    }

    /** @returns {number} */
    get() {
        if (this.#editor.childElementCount > 1) {
            this.#editor.popSpan();
        }
        return this.#editor.memory.shift() ?? load("eof");
    }

    get eof() {
        return this.#eof;
    }
    set eof(value) {
        this.#eof = isFinite(value) ? Math.floor(value) - 256 * Math.floor(value / 256) : 255;
    }
}
