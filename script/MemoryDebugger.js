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
    #activePointer = 0;

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

    expand(newLength = 0) {
        if (newLength === 0) {
            newLength = this.#editor.memory.length + 0x1000;
        }
        else if (newLength <= this.#editor.memory.length) {
            return;
        }
        else {
            newLength = (newLength + 0xfff) & ~0xfff;
        }
        const newMemory = new Uint8Array(newLength);
        for (const [i, cell] of this.#editor.memory.entries()) {
            newMemory[i] = cell;
        }
        this.#editor.memory = newMemory;
        if (this.#updateState) {
            this.#editor.resetDiv();
            this.#updateLineNumbers();
        }
    }

    expandUnchecked(newLength) {
        if (newLength <= this.#editor.memory.length) {
            return;
        }
        newLength = (newLength + 0xfff) & ~0xfff;
        const newMemory = new Uint8Array(newLength);
        for (const [i, cell] of this.#editor.memory.entries()) {
            newMemory[i] = cell;
        }
        this.#editor.memory = newMemory;
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
        const updateState = this.#updateState;
        this.#updateState = true;
        this.setPointer(this.#pointer);
        this.#updateState = updateState;
    }

    getPointer() {
        return this.#pointer;
    }

    /** @param {number} value */
    setPointer(value, error = false) {
        if (isFinite(value) && value >= 0 && value < this.#editor.memory.length) {
            this.#pointer = value;
            if (this.#updateState) {
                const span = this.#memoryDiv.children[this.#pointer];
                this.#memoryDiv.children[this.#activePointer]?.classList.remove("active");
                span?.classList.add("active");
                this.#activePointer = this.#pointer;
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
        else if (error) {
            throw new BrainfuckError("pointerOutOfRange");
        }
    }

    /** @param {number} value */
    setPointerUnchecked(value, error = false) {
        if (value >= 0 && value < this.#editor.memory.length) {
            this.#pointer = value;
        }
        else if (error) {
            throw new BrainfuckError("pointerOutOfRange");
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

    /** @param {number} value */
    addUnchecked(value) {
        this.#editor.memory[this.#pointer] += value;
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

    /** @param {number} value */
    advance(value) {
        if (!isFinite(value)) return;
        const newPointer = this.#pointer + value;
        this.expand(newPointer + 1);
        this.setPointer(newPointer, true);
    }

    /** @param {number} value */
    advanceUnchecked(value) {
        const newPointer = this.#pointer + value;
        this.expandUnchecked(newPointer + 1);
        this.setPointerUnchecked(newPointer, true);
    }

    next() {
        this.setPointer(this.#pointer + 1, true);
    }

    prev() {
        this.setPointer(this.#pointer - 1, true);
    }
}
