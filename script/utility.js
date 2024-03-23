"use strict";

/**
 * @param {string} name
 * @param {any} value
 */
function save(name, value) {
    localStorage.setItem("brainfuck-env_" + name, JSON.stringify(value));
}

/**
 * @param {string} name
 */
function load(name) {
    return JSON.parse(localStorage.getItem("brainfuck-env_" + name));
}

/**
 * @param {string} text
 */
async function writeToClipboard(text) {
    await navigator.clipboard.writeText(text);
}

/**
 * @param {number} value
 * @param {number} width
 */
function toHex(value, width) {
    return value.toString(16).toUpperCase().padStart(width, "0");
}

/**
 * @param {string} str
 * @returns {number[]}
 */
function encodeUTF8(str) {
    return Encoding.convert(str, { from: "Unicode", to: "UTF8", type: "array" });
}

/**
 * @param {number[]} arr
 * @returns {string}
 */
function decodeUTF8(arr) {
    return Encoding.convert(arr, { from: "UTF8", to: "Unicode", type: "string" });
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}
