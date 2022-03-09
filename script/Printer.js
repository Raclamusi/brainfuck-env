"use strict";

class Printer {
    /** @param {number[]} a */
    static #makeRGBs(a) {
        return a.map(r => a.map(g => a.map(b => [r, g, b])).flat()).flat();
    }
    /** @param {number[]} rgb */
    static #toColor(rgb) {
        return `rgb(${rgb.join(",")})`;
    }
    /** @param {number[]} rgb */
    static #toLowLum(rgb) {
        return rgb.map(x => Math.floor((x + 30) / 2));
    }

    // LF（改行）の文字コード
    static #LF = 0x0a;
    static get LF() { return Printer.#LF; }
    // ESC（エスケープ）の文字コード
    static #ESC = 0x1b;
    static get ESC() { return Printer.#ESC; }
    // 8-bit color
    static #COLORS = [
        // 0-15 標準の色(0-7)と高輝度の色(8-15)
        ...[0, 68].map(x => Printer.#makeRGBs([x, x + 187])).flat().map(x => x.reverse()),
        // 16-231 拡張色（カラー）
        ...Printer.#makeRGBs([0, 95, 135, 175, 215, 255]),
        // 232-255 拡張色（グレースケール）
        ...[...new Array(24).keys()].map(x => [0, 0, 0].fill(x * 10 + 8)),
        // 256-257 RGB指定用の領域
        [0, 0, 0], [0, 0, 0],
    ];
    static get COLORS() { return Printer.#COLORS; }

    /** @type {HTMLPreElement} */
    #outputPre;
    /** @type {number[][]} */
    #buffers = [[]];
    #span = document.createElement("span");
    #fgColor = -1;
    #bgColor = -1;
    #highLum = false;
    #lowLum = false;
    #inverted = false;
    #underline = false;
    #secret = false;
    #lineThrough = false;

    /** @param {HTMLPreElement} outputPre */
    constructor(outputPre) {
        this.#outputPre = outputPre;
    }

    reset() {
        this.#buffers = [[]];
        this.#outputPre.textContent = "";
        this.#resetStyle();
        this.#outputPre.appendChild(this.#span.cloneNode());
    }

    /** @param {string} s */
    print(s) {
        encodeUTF8(s).forEach(c => this.put(c));
        this.flush();
    }
    
    /** @param {string} s */
    println(s) {
        encodeUTF8(s).forEach(c => this.put(c));
        this.put(Printer.LF);
        this.flush();
    }

    /** @param {number} c */
    put(c) {
        // バッファに文字を追加する
        if (c === Printer.ESC) {
            // エスケープシーケンス開始
            this.#buffers.unshift([c]);
            return;
        }
        if (this.#buffers[0][0] === Printer.ESC) {
            // エスケープシーケンス
            if (c < 0x20) {
                // 0x00 から 0x1f の制御文字はエスケープシーケンスに含めない
                if (this.#buffers.length === 1) {
                    this.#buffers.push([]);
                }
                this.#buffers[1].push(c);
                return;
            }
            this.#buffers[0].push(c);
            if (this.#buffers[0].length === 2 && decodeUTF8([c]) === "[") {
                // 2文字目が '[' ならOK
                return;
            }
            if (c >= 0x40) {
                // 0x40 以上の文字ならエスケープシーケンス終了
                this.#buffers.unshift([]);
            }
            return;
        }
        this.#buffers[0].push(c);
        if (c === Printer.LF) {
            // LF（改行）でバッファを区切る
            this.#buffers.unshift([]);
        }
    }

    flush() {
        if (this.#outputPre.lastChild === null) {
            return;
        }
        // 改行まで削除
        const text = this.#outputPre.lastChild.textContent;
        this.#outputPre.lastChild.textContent = text.slice(0, text.lastIndexOf('\n') + 1);
        // バッファごとにデコードして出力
        for (let i = this.#buffers.length - 1; i >= 0; i--) {
            const buf = this.#buffers[i];
            if (i !== 0 && buf[0] === Printer.ESC) {
                this.#changeStyle(buf);
                this.#outputPre.appendChild(this.#span.cloneNode());
                continue;
            }
            this.#outputPre.lastChild.textContent += decodeUTF8(buf);
        }
        // 追加中のバッファのみ残す
        this.#buffers.splice(1);
        this.#outputPre.scrollTo({ top: this.#outputPre.scrollHeight - this.#outputPre.offsetHeight });
    }

    /** @param {number[]} sequence */
    #changeStyle(sequence) {
        // エスケープシーケンスによって span のスタイルをを変更する
        if (sequence.length < 2 || sequence[0] !== Printer.ESC) {
            return;
        }
        const seq = decodeUTF8(sequence.slice(1));
        if (seq.match(/^\[[;\d]*m$/) === null) {
            // ESC [ ～ m 以外の形式のエスケープシーケンスは無視
            return;
        }
        const args = seq.slice(1, -1).split(";").map(e => e === "" ? 0 : parseInt(e));
        while (args.length > 0) {
            const p = args.shift();
            if (p === 0) {
                // すべての文字属性を解除
                this.#resetStyle();
            }
            else if (p === 1) {
                // 太文字、高輝度に設定
                this.#highLum = true;
                this.#span.style.fontWeight = "bold";
                this.#setColor();
            }
            else if (p === 2) {
                // 低輝度に設定
                this.#lowLum = true;
                this.#setColor();
            }
            else if (p === 3) {
                // イタリックに設定
                this.#span.style.fontStyle = "italic";
            }
            else if (p === 4) {
                // 下線に設定
                this.#underline = true;
                this.#setDecoration();
            }
            else if (p === 5) {
                // 文字を低速点滅
                this.#span.style.animationDuration = "250ms";
            }
            else if (p === 6) {
                // 文字を高速点滅
                this.#span.style.animationDuration = "125ms";
            }
            else if (p === 7) {
                // 文字色と背景色を反転
                this.#inverted = true;
                this.#setColor();
            }
            else if (p === 8) {
                // 文字色を背景色と同じにする
                this.#secret = true;
                this.#setColor();
            }
            else if (p === 9) {
                // 文字の打ち消し線を設定
                this.#lineThrough = true;
                this.#setDecoration();
            }
            else if (p === 21) {
                // 下線を設定
                this.#underline = true;
                this.#setDecoration();
            }
            else if (p === 22) {
                // 太文字と低輝度を解除
                this.#highLum = false;
                this.#lowLum = false;
                this.#setColor();
            }
            else if (p === 23) {
                // イタリックを解除
                this.#span.style.fontStyle = "";
            }
            else if (p === 24) {
                // 下線を解除
                this.#underline = false;
                this.#setDecoration();
            }
            else if (p === 25) {
                // 点滅を解除
                this.#span.style.animationDuration = "";
            }
            else if (p === 27) {
                // 反転を解除
                this.#inverted = false;
                this.#setColor();
            }
            else if (p === 28) {
                // シークレットを解除
                this.#secret = false;
                this.#setColor();
            }
            else if (p === 29) {
                // 打ち消し線を解除
                this.#lineThrough = false;
                this.#setDecoration();
            }
            else if (p >= 30 && p <= 37) {
                // 文字色の設定
                this.#fgColor = p - 30;
                this.#setColor();
            }
            else if (p === 38) {
                const p1 = args.shift() ?? 0;
                if (p1 === 2) {
                    // RGBで文字色を設定
                    const p2_4 = [...args.splice(0, 3), 0, 0, 0].slice(0, 3);
                    Printer.COLORS[256] = p2_4;
                    this.#fgColor = 256;
                    this.#setColor();
                }
                else  if (p1 === 5) {
                    // 拡張文字色を設定
                    const p2 = args.shift() ?? 0;
                    if (p2 >= 0 && p2 < 256) {
                        this.#fgColor = p2;
                        this.#setColor();
                    }
                }
            }
            else if (p === 39) {
                // 文字色をデフォルト色に戻す
                this.#fgColor = -1;
                this.#setColor();
            }
            else if (p >= 40 && p <= 47) {
                // 背景色の設定
                this.#bgColor = p - 40;
                this.#setColor();
            }
            else if (p === 48) {
                const p1 = args.shift() ?? 0;
                if (p1 === 2) {
                    // RGBで背景色を設定
                    const p2_4 = [...args.splice(0, 3), 0, 0, 0].slice(0, 3);
                    Printer.COLORS[257] = p2_4;
                    this.#bgColor = 257;
                    this.#setColor();
                }
                else  if (p1 === 5) {
                    // 拡張背景色の設定
                    const p2 = args.shift() ?? 0;
                    if (p2 >= 0 && p2 < 256) {
                        this.#bgColor = p2;
                        this.#setColor();
                    }
                }
            }
            else if (p === 49) {
                // 背景色をデフォルト色に戻す
                this.#bgColor = -1;
                this.#setColor();
            }
            else if (p >= 90 && p <= 97) {
                // 高輝度の文字色設定
                this.#fgColor = p - 90 + 8;
                this.#setColor();
            }
            else if (p >= 100 && p <= 107) {
                // 高輝度の背景色設定
                this.#bgColor = p - 100 + 8;
                this.#setColor();
            }
        }
    }

    #resetStyle() {
        this.#span.style.cssText = "";
        this.#fgColor = -1;
        this.#bgColor = -1;
        this.#highLum = false;
        this.#lowLum = false;
        this.#inverted = false;
        this.#underline = false;
        this.#secret = false;
        this.#lineThrough = false;
    }

    /** @param {keyof CSSStyleDeclaration} style  @returns {number[]} */
    #getDefaultColor(style) {
        return getComputedStyle(this.#outputPre)[style].match(/\((\d+), (\d+), (\d+)/).slice(1).map(e => parseInt(e));
    }

    #setColor() {
        const [fgNum, bgNum] = (x => this.#inverted ? x.reverse() : x)([this.#fgColor, this.#bgColor]);
        if (this.#secret) {
            this.#span.style.color = "transparent";
        }
        else {
            const rgb = fgNum === -1 ? this.#getDefaultColor(this.#inverted ? "backgroundColor" : "color")
                                     : Printer.COLORS[fgNum + (this.#highLum && fgNum >= 0 && fgNum < 8 ? 8 : 0)];
            this.#span.style.color = Printer.#toColor(this.#lowLum ? Printer.#toLowLum(rgb) : rgb);
        }
        {
            const rgb = bgNum === -1 ? this.#getDefaultColor(this.#inverted ? "color" : "backgroundColor")
                                     : Printer.COLORS[bgNum];
            this.#span.style.backgroundColor = Printer.#toColor(this.#lowLum ? Printer.#toLowLum(rgb) : rgb);
        }
    }

    #setDecoration() {
        this.#span.style.textDecorationLine = `${this.#underline ? "underline" : ""} ${this.#lineThrough ? "line-through" : ""}`
    }
}
