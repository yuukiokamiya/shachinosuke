// =====================================================================
//  パチスロ（しゃちのすけ）用：micro:bit のボタンと HUSKYLENS 2 の表情を Bluetooth で送る
//
//  送る文字（1行ずつ）
//    A ボタン   → "BTN,A"     パチスロ側で「止まっていればレバー、回っていれば左の停止」
//    ロゴ       → "BTN,LOGO"  中の停止
//    B ボタン   → "BTN,B"     右の停止
//    表情       → "EXP,4"     表情の番号。表情が変わったときと、1秒ごとに送る
//                 1 怒り / 2 嫌悪 / 3 恐れ / 4 喜び / 5 ふつう / 6 悲しみ / 7 驚き / 0 顔が無い
//    （パチスロ側は EXP が3秒以内に届いていれば「HuskyLens がつながっている」と考える）
//
//  準備（MakeCode for micro:bit、micro:bit V2）
//    1. 新しいプロジェクトを作り、拡張機能を2つ追加する
//       ・bluetooth（入れると radio は外れる。両方は使えない）
//       ・HuskyLens 2 の修正版 https://github.com/yuukiokamiya/pxt-DFRobot_HuskyLensV2 （v1.3.0 以降）
//    2. 歯車 →「プロジェクトの設定」で「No Pairing Required」を選んで保存する
//    3. JavaScript 表示にして、このファイルの中身を貼り付ける
//    4. micro:bit V2 に書き込む
//
//  HuskyLens 2 は I2C でつなぎ、本体の「Protocol Type」を I2C にしておく。
//  HuskyLens をつないでいなくても、ボタンはそのまま使える（表情は送られない）。
//
//  LED：□ 待っている / ✓ つながった。押すたびに下の段の点がチカッと変わる
// =====================================================================

let connected = false
let huskyReady = false
let lastExp = -1
let lastExpSent = 0

// ---- Bluetooth とボタン（HuskyLens より先に準備する） ----
bluetooth.startUartService()
basic.showIcon(IconNames.Square)

bluetooth.onBluetoothConnected(function () {
    connected = true
    lastExp = -1          // つながったらすぐ表情を送り直す
    basic.showIcon(IconNames.Yes)
})

bluetooth.onBluetoothDisconnected(function () {
    connected = false
    basic.showIcon(IconNames.Square)
})

// つながっているときだけ送る。x は押したことを LED の下の段で知らせる位置
function sendButton(name: string, x: number) {
    if (!connected) return
    bluetooth.uartWriteLine("BTN," + name)
    led.toggle(x, 4)
}

// 「押した瞬間」に送る（onButtonPressed は離したときに動くので、目押しが遅れる）
control.onEvent(EventBusSource.MICROBIT_ID_BUTTON_A, EventBusValue.MICROBIT_BUTTON_EVT_DOWN, function () {
    sendButton("A", 0)
})
control.onEvent(EventBusSource.MICROBIT_ID_BUTTON_B, EventBusValue.MICROBIT_BUTTON_EVT_DOWN, function () {
    sendButton("B", 4)
})
input.onLogoEvent(TouchButtonEvent.Touched, function () {
    sendButton("LOGO", 2)
})

// ---- HUSKYLENS 2：表情認識 ----
// I2CInit は HuskyLens が見つかるまで待ち続けるので、ボタンの準備のあとに置く
huskylens2.I2CInit()
huskylens2.switchAlgorithm(huskylens2.Algorithm.AlgorithmEmotionRecognition)
huskyReady = true

basic.forever(function () {
    if (!huskyReady || !connected) {
        basic.pause(200)
        return
    }
    let exp = 0
    huskylens2.getResultEmotionRecognition()
    if (huskylens2.availableEmotionRecognition()) {
        exp = huskylens2.cachedCenterEmotionResult(huskylens2.BasePropertyId.Id)
    }
    // 表情が変わったとき、または1秒たったときに送る（届き続けることで「つながっている」と伝える）
    if (exp != lastExp || control.millis() - lastExpSent > 1000) {
        bluetooth.uartWriteLine("EXP," + exp)
        lastExp = exp
        lastExpSent = control.millis()
    }
    basic.pause(200)
})
