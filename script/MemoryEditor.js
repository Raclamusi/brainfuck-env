"use strict";

class MemoryEditor {
    /** @type {number[] | Uint8Array} */
    memory;

    /** @type {HTMLDivElement} */
    #memoryDiv;
    /** @type {number} */
    #selectedIndex = -1;
    /** @type {() => void} */
    #expandMemory = null;

    /**
     * @param {number[] | Uint8Array} memory
     * @param {HTMLDivElement} memoryDiv
     * @param {number} colNum
     */
    constructor(memory, memoryDiv, colNum = 0) {
        this.memory = memory;
        this.#memoryDiv = memoryDiv;
        
        const moveCursor = {
            ArrowLeft: () => {
                if (this.#selectedIndex <= 0) return;
                this.#selectSpan(this.#selectedIndex - 1);
            },
            ArrowRight: () => {
                if (this.#selectedIndex < 0) return;
                if (this.#selectedIndex >= this.#memoryDiv.childElementCount - 1) return;
                this.#selectSpan(this.#selectedIndex + 1);
            },
            ArrowUp: () => {
                if (this.#selectedIndex <= 0) return;
                this.#selectSpan(colNum > 0 ? Math.max(0, this.#selectedIndex - colNum) : 0);
            },
            ArrowDown: () => {
                if (this.#selectedIndex < 0) return;
                const maxIndex = this.#memoryDiv.childElementCount - 1;
                if (this.#selectedIndex >= maxIndex) return;
                this.#selectSpan(colNum > 0 ? Math.min(maxIndex, this.#selectedIndex + colNum) : maxIndex);
            },
        };
        addEventListener("keydown", e => {
            if (this.#selectedIndex < 0) return;
            if (!(e.code in moveCursor)) return;
            e.preventDefault();
            moveCursor[e.code]();
        });
    }

    get childElementCount() {
        return this.#memoryDiv.childElementCount;
    }

    /** @param {() => void} func */
    setExpandMemoryFunc(func) {
        this.#expandMemory = func;
    }

    /** @param {number} index */
    #getDefaultContent(index) {
        return index < this.memory.length ? toHex(this.memory[index], 2) : "\xa0\xa0";
    }

    /** @param {number} index */
    #selectSpan(index) {
        if (this.#selectedIndex >= 0) {
            this.#unselectSpan();
        }
        if (index >= this.#memoryDiv.childElementCount) {
            this.#selectedIndex = -1;
            return;
        }
        this.#selectedIndex = index;

        let value = this.#getDefaultContent(index);
        const input = document.createElement("input");
        input.value = value;
        input.addEventListener("input", e => {
            if (e.inputType === "insertText" && e.data.match(/[\da-f]/) !== null) {
                if (value.length === 1) {
                    value += e.data.toUpperCase();
                    if (index >= this.memory.length) {
                        if (this.#expandMemory !== null) {
                            this.#expandMemory();
                        }
                    }
                    if (index < this.memory.length) {
                        this.memory[index] = parseInt(value, 16);
                    }
                }
                else {
                    value = e.data.toUpperCase();
                }
            }
            input.value = value;
        });
        input.addEventListener("blur", () => this.#unselectSpan());

        const span = this.#memoryDiv.children[index];
        span.classList.add("selected");
        span.textContent = "";
        span.appendChild(input);
        input.focus();
        
    }

    #unselectSpan() {
        const index = this.#selectedIndex;
        if (index < 0 || index >= this.#memoryDiv.childElementCount) return;
        const span = this.#memoryDiv.children[this.#selectedIndex];
        span.textContent = this.#getDefaultContent(index);
        span.classList.remove("selected");
    }

    resetDiv(hard = false) {
        const n = Math.min(this.#memoryDiv.childElementCount, this.memory.length);
        for (let i = 0; i < n; i++) {
            this.#memoryDiv.children[i].textContent = toHex(this.memory[i], 2);
        }
        for (let i = n; i < this.#memoryDiv.childElementCount; i++) {
            if (hard) {
                this.#memoryDiv.removeChild(this.#memoryDiv.lastElementChild);
            }
            else {
                this.#memoryDiv.children[i].textContent = "\xa0\xa0";
            }
        }
        for (let i = n; i < this.memory.length; i++) {
            this.pushSpan();
        }
    }

    pushSpan() {
        const index = this.#memoryDiv.childElementCount;
        const span = document.createElement("span");
        span.textContent = this.#getDefaultContent(index);
        span.addEventListener("click", e => {
            return this.#selectSpan(
                this.memory instanceof Uint8Array ? index : [...this.#memoryDiv.children].indexOf(span)
            );
        });
        this.#memoryDiv.appendChild(span);
    }

    popSpan() {
        if (this.#memoryDiv.firstElementChild === null) return;
        this.#memoryDiv.removeChild(this.#memoryDiv.firstElementChild);
        if (this.#selectedIndex >= 0) {
            this.#selectedIndex--;
        }
    }
}