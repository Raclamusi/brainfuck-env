"use strict";

class MemoryDebugger {
    /** @type {HTMLDivElement} */
    #memoryDiv;
    /** @type {HTMLDivElement} */
    #lineNumbersDiv;
    /** @type {HTMLSpanElement} */
    #pointerSpan;
    /** @type {HTMLInputElement} */
    #autoscrollInput;
    /** @type {MemoryEditor} */
    #editor;
    #pointer = 0;
    #updateState = true;

    /**
     * @param {HTMLDivElement} memoryDiv
     * @param {HTMLDivElement} lineNumbersDiv
     * @param {HTMLSpanElement} pointerSpan
     * @param {HTMLInputElement} autoscrollInput
     * @param {HTMLButtonElement} expandButton
     */
    constructor(memoryDiv, lineNumbersDiv, pointerSpan, autoscrollInput, expandButton) {
        this.#editor = new MemoryEditor(new Uint8Array(0x1000), memoryDiv, 16);
        this.#editor.setFunctionOnRightClick(index => this.setPointer(index));
        this.#memoryDiv = memoryDiv;
        this.#lineNumbersDiv = lineNumbersDiv;
        this.#autoscrollInput = autoscrollInput;
        this.#pointerSpan = pointerSpan;
        pointerSpan.addEventListener("click", () => {
            const input = document.createElement("input");
            input.value = toHex(this.#pointer, 8);
            const apply = () => this.setPointer(parseInt(input.value, 16));
            input.addEventListener("blur", apply);
            input.addEventListener("change", apply);
            pointerSpan.textContent = "";
            pointerSpan.appendChild(input);
            input.focus();
            input.select();
        });
        expandButton.addEventListener("click", () => this.expand());
    }

    #updateLineNumbers() {
        let line = this.#lineNumbersDiv.childElementCount * 16;
        for (; line < this.#editor.memory.length; line += 16) {
            const span = document.createElement("span");
            span.textContent = toHex(line, 8);
            this.#lineNumbersDiv.appendChild(span);
        }
    }

    get memoryLength() {
        return this.#editor.memory.length;
    }

    expand() {
        const newMemory = new Uint8Array(this.#editor.memory.length + 0x1000);
        for (const [i, cell] of this.#editor.memory.entries()) {
            newMemory[i] = cell;
        }
        this.#editor.memory = newMemory;
        if (this.#updateState) {
            this.#editor.resetDiv();
            this.#updateLineNumbers();
        }
    }

    /** @param {boolean} state */
    setUpdateState(state) {
        this.#updateState = state;
    }

    reset() {
        this.#editor.memory.fill(0);
        if (this.#updateState) {
            this.#editor.resetDiv();
            this.#updateLineNumbers();
        }
        this.setPointer(0);
    }

    update() {
        this.#editor.resetDiv();
        this.#updateLineNumbers();
        this.#pointerSpan.textContent = toHex(this.#pointer, 8);
        this.#memoryDiv.children[this.#pointer]?.classList.add("active");
    }

    getPointer() {
        return this.#pointer;
    }

    /** @param {number} value */
    setPointer(value, error = false) {
        this.#memoryDiv.children[this.#pointer]?.classList.remove("active");
        if (isFinite(value) && value >= 0 && value < this.#editor.memory.length) {
            this.#pointer = value;
        }
        else if (error) {
            throw new BrainfuckError("pointerOutOfRange");
        }
        if (this.#updateState) {
            const span = this.#memoryDiv.children[this.#pointer];
            span?.classList.add("active");
            this.#pointerSpan.textContent = toHex(this.#pointer, 8);
            if (this.#autoscrollInput.checked && span !== undefined && this.#memoryDiv.parentElement !== null) {
                const memHeight = this.#memoryDiv.offsetHeight;
                const memTop = this.#memoryDiv.parentElement.scrollTop;
                const memBottom = memTop + memHeight;
                const cellHeight = span.offsetHeight;
                const cellTop = span.offsetTop - this.#memoryDiv.offsetTop;
                const cellBottom = cellTop + cellHeight;
                if (cellTop <= memTop || cellBottom >= memBottom) {
                    this.#memoryDiv.parentElement.scrollTo(0, cellTop - (memHeight - cellHeight) / 2);
                }
            }
        }
    }

    get() {
        return this.#editor.memory[this.#pointer];
    }

    /** @param {number} value */
    set(value) {
        if (!isFinite(value)) return;
        this.#editor.memory[this.#pointer] = value;
        if (this.#updateState) {
            this.#editor.updateSpan(this.#pointer);
        }
    }

    /** @param {number} value */
    add(value) {
        if (!isFinite(value)) return;
        this.#editor.memory[this.#pointer] += value;
        if (this.#updateState) {
            this.#editor.updateSpan(this.#pointer);
        }
    }

    inc() {
        this.#editor.memory[this.#pointer]++;
        if (this.#updateState) {
            this.#editor.updateSpan(this.#pointer);
        }
    }

    dec() {
        this.#editor.memory[this.#pointer]--;
        if (this.#updateState) {
            this.#editor.updateSpan(this.#pointer);
        }
    }

    next() {
        this.setPointer(this.#pointer + 1, true);
    }

    prev() {
        this.setPointer(this.#pointer - 1, true);
    }
}
