"use strict";

class Scanner {
    /** @type {HTMLTextAreaElement} */
    #textarea;
    /** @type {MemoryEditor} */
    #editor;

    /**
     * @param {HTMLTextAreaElement} textarea
     * @param {HTMLDivElement} bufferDiv
     */
    constructor(textarea, bufferDiv) {
        this.#textarea = textarea;
        this.#editor = new MemoryEditor([], bufferDiv);
        this.#editor.setExpandMemoryFunc(() => {
            this.#editor.memory.push(0);
            this.#editor.pushSpan();
        });
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
}
