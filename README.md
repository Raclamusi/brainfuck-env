# RacBrainfuck

ぼくの考えた最強の Brainfuck 環境です。

サンプル: https://raclamusi.github.io/brainfuck-env/?share=PJjrsSxxsxbtaBIB

## 仕様

### Brainfuck

- **値のサイズ**: 符号なし 8bit (0–255)
- **EOF（入力の終端）**: 設定で変更可能
- **wrap-around**: 可能（ 0 に対するデクリメントは 255 、 255 に対するインクリメントは 0 ）
- **メモリ領域外アクセス**: エラー
- **メモリサイズ**: 自動で拡張
- **対応しない角括弧**: エラー
- **命令**:
  - **`>`** : ポインタをインクリメントします。メモリ領域外に出たときはメモリサイズが自動的に拡張されます。
  - **`<`** : ポインタをデクリメントします。メモリ領域外に出たときはエラーです。
  - **`+`** : ポインタの指す値をインクリメントします。 255 に対するインクリメントは 0 です。
  - **`-`** : ポインタの指す値をデクリメントします。 0 に対するデクリメントは 255 です。
  - **`.`** : ポインタの指す値を出力します。
  - **`,`** : 入力から1バイト読み込んで、ポインタの指す先をその値に書き換えます。
  - **`[`** : ポインタの指す値が 0 なら対応する `]` の直後にジャンプ、そうでないなら何もしません。
  - **`]`** : ポインタの指す値が 0 でないなら対応する `[` の直後にジャンプ、そうでないなら何もしません。
- **拡張命令**:
  - **`@`** : この命令に到達したときに自動的に停止します（ブレークポイント）。デバッグ実行でない場合は無視されます。
  - **`!`** : 後述するコマンドの開始を表す命令です。デバッグ実行でない場合は無視されます。
- **コマンド**: コマンドを使用することで、デバッグ実行時にデバッガの機能を使用することができます。コマンドは `!`*command-name*`(`*argument-list*`)` の形式で記述します。 *command-name* はコマンド名を示す文字列、 *argument-list* は空白区切りの引数リストです。引数リストに Brainfuck の命令を含むことはできません。負号には `_` を使用します。小数は諦めてください。
  - <code><b>!mark(</b><i>name</i> <b>~</b><sub>opt</sub><i>pos</i> <i>size</i> <i>color</i><b>)</b></code> : メモリデバッガの指定したセルを着色します。既に同じ *name* で着色している場合は、その範囲の色を消去してから着色します。 *size* が非負のときは [*pos*, *pos*＋*size*) 、 *size* が負のときは [*pos*＋*size*, *pos*) の範囲を着色します。 *pos* の前に `~` を付けた場合は、 *pos* はコマンド実行時のポインタの位置からの相対位置として処理されます。 `~` のみの場合は実行時のポインタの位置として処理されます。 *color* に含まれる `_` は `-` に置換されます。置換後の *color* は CSS の [`<color>`](https://developer.mozilla.org/ja/docs/Web/CSS/color_value) 値である必要があります。小数点は使えないので、 `%` などで頑張ってください。また、**着色の範囲が重なった場合は未定義の着色結果です**。
    - `!mark(example1 42 0x10 yellow)` : [42, 58) の範囲を黄色に着色
    - `!mark(example2 ~ _0b101 rgb(255 192 203))` : 実行時のポインタの指す位置から見て [−5, 0) の範囲を `rgb(255 192 203)` に着色
  - <code><b>!mark(</b><i>name</i><b>)</b></code> : *name* で着色している範囲の色を消去します。
    - `!mark(example1)` : `example1` で着色した範囲の色を消去
  - <code><b>!print(</b><i>message</i><b>)</b></code> : *message* を出力します。 *message* には JavaScript の文字列リテラルで使用できるエスケープシーケンスがそのまま使えます。
    - `!print(Hello\x2c World\x21)` : `Hello, World!` を出力
    - `!print(\x1b\x5b1;3;5;31;43m5000兆円\x1b\x5b37;100m欲しい！\x1b\x5bm)` : <code><i>5000兆円欲しい！</i></code> を出力

### 入出力

- **入出力の文字コード**: UTF-8
- **出力のエスケープシーケンス**: `ESC[` から始まって `m` で終わるものの一部に対応

### デバッガ

- **実行**: デバッグ実行を開始します。
- **停止**: 実行を停止します。
- **再開**: 停止した実行を再開します。
- **終了**: デバッグ実行を中断して終了します。
- **デバッグなしで実行**: デバッグ機能を使わず実行します。停止や中断ができない代わりに高速に実行します。実行が終了するまで応答がなくなります。
- **ステップ実行**: 1命令だけ実行してすぐ停止します。ただし、命令は最適化によりまとめて扱われる場合があります。実行が開始されていない場合は、デバッグ実行を開始してすぐ停止します。
- **ループを出るまで実行**: 現在のループを出るまで実行して停止します。デバッグ実行停止中にのみ使用できます。
- **実行ステータス**: 実行の状態を表示します。

### メモリ・入力デバッガ

クリックしたセルは緑色になり、キーボードで編集できるようになります。
また、編集可能なセルはキーボードの矢印キーで移動できます。

赤色のセルは、現在 Brainfuck のポインタが差しているセルです。セルを右クリックすることや、「ポインタ」の値を編集することで、デバッグ実行の停止中にポインタの値を変更することができます。

「自動スクロール」にチェックが入っていると、ポインタの動きに合わせてメモリデバッガがスクロールするようになります。

「メモリを追加」を押すと、メモリが 4 KiB 追加されます（この方法で追加しなくても実行中に自動で追加されます）。

### 自動保存

コードと入力は自動で保存され、次回アクセス時にその内容を反映します。
保存は、入力後しばらくしたとき、実行した時、共有した時に行われます。

### 共有

右上の「共有」ボタンを押してしばらく待つと、ブラウザのアドレスバーが共有リンクに変わります。

共有リンクにアクセスしてしばらく待つと、コードと入力に共有された内容が適用されます。

Google App Script で実装しているので、レスポンスはかなり遅いです。
