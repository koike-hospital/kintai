/**
 * はじめての方の登録（職員番号・氏名を入れて、PINを自分で決める）
 * register.html・punch.html（スマホ）と kiosk.html（タブレット）で共通に使う
 *
 * KintaiSignup.open(container, payload, opts)
 *   payload：{ key }（タブレット）または { t }（院内QR）または {}（登録ページ）
 *   opts.phone：スマホも一緒に登録するか
 *   opts.onDone(result)：申請が受け付けられたとき
 *   opts.onBack()：「戻る」を押したとき（省略可）
 *   opts.onActivity()：入力があったとき（タブレットの自動リセット用。省略可）
 */
window.KintaiSignup = (function () {
  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
    if (text) e.textContent = text;
    return e;
  }
  function msg(box, text, cls) {
    box.innerHTML = '';
    if (!text) return;
    box.appendChild(el('div', { class: 'msg ' + (cls || 'err') }, text));
  }

  function open(container, payload, opts) {
    opts = opts || {};
    container.innerHTML = '';
    container.appendChild(el('p', { class: 'name' }, 'はじめての方の登録'));
    container.appendChild(el('p', { class: 'muted' },
      '職員番号と氏名を入れて、打刻に使うPIN（4桁の暗証番号）をご自分で決めてください。' +
      '事務局が確認して承認すると使えるようになります。' +
      (opts.phone ? 'このスマホも、あなたの打刻用として一緒に登録されます。' : '')));

    const fields = [
      ['職員番号', 'no', { inputmode: 'numeric', autocomplete: 'off' }],
      ['氏名（例：小池 花子）', 'name', { type: 'text', autocomplete: 'off' }],
      ['PIN（ご自分で決める4桁の数字）', 'pin', { type: 'password', inputmode: 'numeric', autocomplete: 'off', maxlength: '4' }],
      ['PIN（確認のため、もう一度）', 'pin2', { type: 'password', inputmode: 'numeric', autocomplete: 'off', maxlength: '4' }],
    ];
    const input = {};
    fields.forEach(([label, key, attrs]) => {
      container.appendChild(el('label', {}, label));
      input[key] = el('input', attrs);
      input[key].addEventListener('input', () => { if (opts.onActivity) opts.onActivity(); });
      container.appendChild(input[key]);
    });
    container.appendChild(el('p', { class: 'muted' },
      '※ 同じ数字の繰り返し（1111）・連番（1234）・生まれ年のような数字（1985など）は使えません。PINは他の人に教えないでください。'));

    const btn = el('button', { class: 'b-in primary', style: 'width:100%;margin-top:12px' }, '登録を申請する');
    const box = el('div');
    container.appendChild(btn);
    container.appendChild(box);
    if (opts.onBack) {
      const back = el('button', { class: 'b-sub' }, '戻る');
      back.onclick = opts.onBack;
      container.appendChild(back);
    }

    btn.onclick = async () => {
      const v = k => input[k].value.trim();
      if (!v('no') || !v('name') || !v('pin')) { msg(box, '職員番号・氏名・PINを入力してください'); return; }
      if (!/^[0-9０-９]{4}$/.test(v('pin'))) { msg(box, 'PINは4桁の数字で決めてください'); return; }
      if (v('pin') !== v('pin2')) { msg(box, '確認のPINが一致しません。もう一度入力してください'); return; }
      btn.disabled = true;
      msg(box, '');
      try {
        const r = await kintaiApi('selfRegister',
          Object.assign({}, payload, { no: v('no'), name: v('name'), pin: v('pin'), phone: !!opts.phone }));
        input.pin.value = input.pin2.value = '';
        if (opts.onDone) opts.onDone(r);
      } catch (e) {
        msg(box, e.message);
      } finally {
        btn.disabled = false;
      }
    };
    input.no.focus();
  }

  return { open };
})();
