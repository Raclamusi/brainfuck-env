"use strict";

const shareURL = "https://script.google.com/macros/s/AKfycbyKp9yqmQcvVcXL6pZqm7Nuw3l2sH4x0DJgePnqXMiuIZqTzJN7_5Tx4DPhhmYiTqVq/exec";

function getShareID() {
    return new URLSearchParams(location.search).get("share");
}

/**
 * @param {string} id 
 */
async function getSharedContent(id) {
    const url = new URL(shareURL);
    url.searchParams.set("id", id);
    const res = await fetch(url);
    /** @type {{ code?: string, input?: string, timestamp?: string, error?: string }} */
    const json = await res.json();
    return json;
}

/**
 * @param {string} code 
 * @param {string} input 
 */
async function shareContent(code, input) {
    const body = JSON.stringify({ code, input });
    // Google Apps Script が OPTION メソッドをサポートしていないので、 Content-Type に application/json は設定しない
    const res = await fetch(shareURL, { method: "POST", body });
    /** @type {{ id?: string, error?: string }} */
    const json = await res.json();
    return json;
}
