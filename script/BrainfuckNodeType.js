"use strict";

/** @enum {number} */
const BrainfuckNodeType = Object.freeze({
    None: 0,
    Advance: 1,
    Add: 2,
    Output: 3,
    Input: 4,
    LoopBegin: 5,
    LoopEnd: 6,
    Break: 7,
});
