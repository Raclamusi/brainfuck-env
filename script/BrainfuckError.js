"use strict";

const BrainfuckMessages = {
    pointerOutOfRange: "ポインタの移動先がメモリの範囲外です。",
};

class BrainfuckError {
    /** @param {keyof BrainfuckMessages} key */
    constructor(key) {
        /** @type {string} */
        this.message = BrainfuckMessages[key] ?? "";
    }
}
