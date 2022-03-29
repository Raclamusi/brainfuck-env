"use strict";

class MemoryMarker {
    /** @type {HTMLDivElement} */
    #memoryDiv;
    /** @type {number[][]} */
    #markedIndices = [];

    /** @param {HTMLDivElement} memoryDiv */
    constructor(memoryDiv) {
        this.#memoryDiv = memoryDiv;
    }

    clearMark() {
        for (const [from, to] of this.#markedIndices) {
            for (let i = from; i < to; ++i) {
                this.#memoryDiv.children[i].style.cssText = "";
            }
        }
        this.#markedIndices = [];
    }

    /**
     * @param {number} index
     * @param {number} size
     * @param {string} color
     */
    addMark(index, size, color) {
        const end = Math.min(index + size, this.#memoryDiv.childElementCount);
        if (index < 0) index = 0;
        this.#markedIndices.push([index, end]);
        const border = `1px solid ${color}`;
        this.#memoryDiv.children[index].style.borderLeft = border;
        this.#memoryDiv.children[end - 1].style.borderRight = border;
        for (; index < end; index++) {
            const style = this.#memoryDiv.children[index].style;
            style.borderTop = style.borderBottom = border;
        }
    }
}
