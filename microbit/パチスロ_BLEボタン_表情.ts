// =====================================================================
//  パチスロ（しゃちおっす）用：micro:bit のボタンと HUSKYLENS 2 の表情を Bluetooth で送る
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
//  HuskyLens をつないでいなくても、ボタンはそのまま使える（表情を送らないだけ）。
//  あとから HuskyLens をつないでも、2秒ごとに探しているので見つかれば表情を送り始める。
//
//  LED
//    □         Bluetooth でつながる前
//    ✓         つながった（HuskyLens がない、または顔が映っていない）
//    表情       顔が映っているとき（怒り・嫌悪・恐れ・喜び・ふつう・悲しみ・驚き）
//    （HuskyLens がないときだけ、ボタンを押すと下の段の点がチカッと変わる）
// =====================================================================

let connected = false
let huskyReady = false
let lastExp = -1
let lastExpSent = 0
let lastIcon = -1

// ---- LED：表情の番号でアイコンを変える（0 は ✓） ----
function showExpIcon(id: number) {
    if (id == lastIcon) return
    lastIcon = id
    // 第2引数の 0 は「表示したあと待たない」。待つと表情の送信が遅れる
    if (id == 1) basic.showIcon(IconNames.Angry, 0)
    else if (id == 2) basic.showIcon(IconNames.Confused, 0)
    else if (id == 3) basic.showIcon(IconNames.Ghost, 0)
    else if (id == 4) basic.showIcon(IconNames.Happy, 0)
    else if (id == 5) basic.showIcon(IconNames.Meh, 0)
    else if (id == 6) basic.showIcon(IconNames.Sad, 0)
    else if (id == 7) basic.showIcon(IconNames.Surprised, 0)
    else basic.showIcon(IconNames.Yes, 0)
}

// ---- Bluetooth とボタン（HuskyLens より先に準備する） ----
bluetooth.startUartService()
basic.showIcon(IconNames.Square, 0)

bluetooth.onBluetoothConnected(function () {
    connected = true
    lastExp = -1          // つながったらすぐ表情を送り直す
    lastIcon = -1
    showExpIcon(0)        // ✓（顔が映れば表情のアイコンに変わる）
})

bluetooth.onBluetoothDisconnected(function () {
    connected = false
    lastIcon = -1
    basic.showIcon(IconNames.Square, 0)
})

// つながっているときだけ送る。x は押したことを LED の下の段で知らせる位置
function sendButton(name: string, x: number) {
    if (!connected) return
    bluetooth.uartWriteLine("BTN," + name)
    if (!huskyReady) led.toggle(x, 4)   // 表情のアイコンを出しているときは崩さない
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
// 拡張機能の I2CInit は「見つかるまで LED に ✕ を点滅させ続ける」ので使わず、
// 2秒ごとに静かに探す（見つからなくても LED と Bluetooth はそのまま使える）
while (!huskylens2.beginInternal()) {
    basic.pause(2000)
}
huskylens2.switchAlgorithm(huskylens2.Algorithm.AlgorithmEmotionRecognition)   // 切り替えに約5秒かかる
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
    showExpIcon(exp)
    // 表情が変わったとき、または1秒たったときに送る（届き続けることで「つながっている」と伝える）
    if (exp != lastExp || control.millis() - lastExpSent > 1000) {
        bluetooth.uartWriteLine("EXP," + exp)
        lastExp = exp
        lastExpSent = control.millis()
    }
    basic.pause(200)
})
