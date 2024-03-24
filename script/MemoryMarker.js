"use strict";

class MemoryMarker {
    /** @type {HTMLDivElement} */
    #memoryDiv;
    /** @type {Map<string, { from: number, to: number }>} */
    #markedIndices = new Map();

    /** @param {HTMLDivElement} memoryDiv */
    constructor(memoryDiv) {
        this.#memoryDiv = memoryDiv;
    }

    reset() {
        for (const { from, to } of this.#markedIndices.values()) {
            for (let i = from; i < to; ++i) {
                const span = this.#memoryDiv.children[i]
                span.style.color = "";
                span.style.backgroundColor = "";
            }
        }
        this.#markedIndices.clear();
    }

    /**
     * @param {string} name
     * @param {number} pos
     * @param {number} size
     * @param {string} color
     */
    addMark(name, pos, size, color) {
        if (this.#markedIndices.has(name)) {
            this.removeMark(name);
        }
        const end = Math.min(Math.max(pos + size, 0), this.#memoryDiv.childElementCount);
        if (pos < 0) pos = 0;
        if (pos >= end) return;
        this.#markedIndices.set(name, { from: pos, to: end });
        const firstSpan = this.#memoryDiv.children[pos];
        firstSpan.style.backgroundColor = color;
        const [r, g, b, a] = getComputedStyle(firstSpan).backgroundColor
            .match(/rgba?\((\d+), (\d+), (\d+)(?:, ([.\d]+))?\)/).slice(1)
            .map(e => e === undefined ? 1 : parseInt(e));
        const [r2, g2, b2] = [r, g, b]
            .map(e => e * a / 255)
            .map(e => e <= 0.03928 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4);
        const l = r2 * 0.2126 + g2 * 0.7152 + b2 * 0.0722;
        const c = (l + 0.05) / 0.05;
        const foreColor = c < 4.5 ? "white" : "black";
        firstSpan.style.color = foreColor;
        for (++pos; pos < end; ++pos) {
            const span = this.#memoryDiv.children[pos];
            span.style.backgroundColor = color;
            span.style.color = foreColor;
        }
    }

    /** @param {string} name */
    removeMark(name) {
        const [from, to] = this.#markedIndices.get(name);
        for (let i = from; i < to; ++i) {
            const span = this.#memoryDiv.children[i]
            span.style.color = "";
            span.style.backgroundColor = "";
        }
        this.#markedIndices.delete(name);
    }
}
