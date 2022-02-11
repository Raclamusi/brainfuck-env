"use strict";

const isIE = document.documentMode && document.uniqueID;
if (isIE) {
    alert("このアプリケーションは Internet Explore には対応していません。\nほかのブラウザでお試しください。");
}
