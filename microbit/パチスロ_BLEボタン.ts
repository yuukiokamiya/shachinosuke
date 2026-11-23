// =====================================================================
//  パチスロ（しゃちおっす）用：micro:bit のボタンを Bluetooth で送る
//
//  送る文字（1行ずつ）
//    A ボタン   → "BTN,A"     パチスロ側で「止まっていればレバー、回っていれば左の停止」
//    ロゴ       → "BTN,LOGO"  中の停止
//    B ボタン   → "BTN,B"     右の停止
//
//  準備（MakeCode for micro:bit）
//    1. 新しいプロジェクトを作り、拡張機能で「bluetooth」を追加する
//       （bluetooth を入れると radio は外れる。両方は使えない）
//    2. 歯車 →「プロジェクトの設定」で「No Pairing Required」を選んで保存する
//    3. JavaScript 表示にして、このファイルの中身を貼り付ける
//    4. micro:bit V2 に書き込む
//
//  LED：□ 待っている / ✓ つながった。押すたびに下の段の点がチカッと変わる
// =====================================================================

let connected = false

bluetooth.startUartService()
basic.showIcon(IconNames.Square)

bluetooth.onBluetoothConnected(function () {
    connected = true
    basic.showIcon(IconNames.Yes)
})

bluetooth.onBluetoothDisconnected(function () {
    connected = false
    basic.showIcon(IconNames.Square)
})

// つながっているときだけ送る。x は押したことを LED の下の段で知らせる位置
function send(name: string, x: number) {
    if (!connected) return
    bluetooth.uartWriteLine("BTN," + name)
    led.toggle(x, 4)
}

// 「押した瞬間」に送る（onButtonPressed は離したときに動くので、目押しが遅れる）
control.onEvent(EventBusSource.MICROBIT_ID_BUTTON_A, EventBusValue.MICROBIT_BUTTON_EVT_DOWN, function () {
    send("A", 0)
})
control.onEvent(EventBusSource.MICROBIT_ID_BUTTON_B, EventBusValue.MICROBIT_BUTTON_EVT_DOWN, function () {
    send("B", 4)
})
input.onLogoEvent(TouchButtonEvent.Touched, function () {
    send("LOGO", 2)
})
