// GASをウェブアプリとして公開したときのURL（…/exec）に書き換える
window.KINTAI_GAS_URL = 'https://script.google.com/macros/s/AKfycbwRYETHuym4Yxf0EewMaX9_5jFhqbLbAiwSKK_ne7k1FyIyW3FwR750vNxVLTsRMf5a0A/exec';

/** GAS APIの呼び出し（text/plain で送るとCORSの事前確認が不要になる） */
window.kintaiApi = async function (action, payload) {
  const res = await fetch(window.KINTAI_GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ action }, payload || {})),
  });
  if (!res.ok) throw new Error('サーバーに接続できませんでした（' + res.status + '）');
  const data = await res.json();
  if (!data.ok && !data.needReason) throw new Error(data.error || 'エラーが発生しました');
  return data;
};

window.kintaiStore = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 保存できない環境では毎回登録 */ } },
  remove(k) { try { localStorage.removeItem(k); } catch (e) { /* noop */ } },
};

window.KINTAI_REASONS = [
  '業務のため（残業・休日出勤）',
  '業務外（私用・自己研鑽・通勤の都合など）',
  'その他（所属長に報告します）',
];
