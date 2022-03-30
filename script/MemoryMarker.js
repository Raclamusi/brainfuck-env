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
                this.#memoryDiv.children[i].style.color = "";
                this.#memoryDiv.children[i].style.backgroundColor = "";
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
        for (; index < end; index++) {
            const span = this.#memoryDiv.children[index];
            span.style.backgroundColor = color;
            const [r, g, b, a] = getComputedStyle(span).backgroundColor
                .match(/rgba?\((\d+), (\d+), (\d+)(?:, ([.\d]+))?\)/).slice(1)
                .map(e => e === undefined ? 1 : parseInt(e));
            const [r2, g2, b2] = [r, g, b]
                .map(e => e * a / 255)
                .map(e => e <= 0.03928 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4);
            const l = r2 * 0.2126 + g2 * 0.7152 + b2 * 0.0722;
            const c = (l + 0.05) / 0.05;
            span.style.color = c < 4.5 ? "white" : "black";
        }
    }
}
