/**
 * 休暇の申請・確認パネル（punch.html と kiosk.html で共通）
 *   KintaiLeave.open(container, auth, { onBack, onActivity })
 *   auth … スマホは { t, deviceToken }、タブレットは { key, no, pin }
 */
window.KintaiLeave = (function () {
  const STATUS_CLASS = { '申請中': 'st-wait', '承認': 'st-ok', '却下': 'st-ng', '取消': 'st-off' };

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else e.setAttribute(k, v);
    });
    (children || []).forEach(c => e.appendChild(c));
    return e;
  }

  function fmtDate(key) {
    const d = new Date(key + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;
  }

  function open(root, auth, opts) {
    opts = opts || {};
    const touch = () => opts.onActivity && opts.onActivity();
    root.innerHTML = '';
    const title = el('p', { class: 'name', text: '休暇の申請' });
    const status = el('div', { class: 'muted', text: '読み込んでいます…' });
    root.appendChild(title);
    root.appendChild(status);

    kintaiApi('leaveList', auth).then(data => {
      status.remove();
      if (!data.allowed) {
        root.appendChild(el('p', { text: '病棟の職員の休暇は勤務表で管理します。所属長に申し出てください。' }));
        root.appendChild(backButton());
        return;
      }
      render(data);
    }).catch(e => {
      status.className = 'msg err';
      status.textContent = e.message;
      root.appendChild(backButton());
    });

    function backButton() {
      const b = el('button', { class: 'b-sub', text: '戻る' });
      b.onclick = () => opts.onBack && opts.onBack();
      return b;
    }

    function render(data) {
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const date = el('input', { type: 'date', min: data.minDate, max: data.maxDate, value: todayKey });
      const kind = el('select', {}, data.kinds.map(k => el('option', { value: k, text: k })));
      const unit = el('select', {});
      const hours = el('select', {}, [1, 2, 3, 4, 5, 6, 7].map(h => el('option', { value: String(h), text: h + '時間' })));
      const hoursWrap = el('div', { class: 'hidden' }, [el('label', { text: '時間数' }), hours]);
      const reason = el('input', { type: 'text', maxlength: '200', placeholder: '例：通院のため（任意）' });
      const note = el('p', { class: 'muted', text: '' });
      const msg = el('div');
      const submit = el('button', { class: 'b-in primary', text: '申請する' });
      submit.style.width = '100%';
      submit.style.marginTop = '16px';

      function refreshUnits() {
        const hourly = data.hourlyKinds.indexOf(kind.value) >= 0;
        const current = unit.value;
        unit.innerHTML = '';
        data.units.filter(u => u !== '時間単位' || hourly).forEach(u => unit.appendChild(el('option', { value: u, text: u })));
        if ([...unit.options].some(o => o.value === current)) unit.value = current;
        hoursWrap.classList.toggle('hidden', unit.value !== '時間単位');
      }
      function refreshNote() {
        note.textContent = date.value && date.value < todayKey
          ? '過ぎた日の申請です（急なお休みの後日申請）。事務局の承認で記録が直ります。'
          : '';
      }
      kind.onchange = () => { refreshUnits(); touch(); };
      unit.onchange = () => { hoursWrap.classList.toggle('hidden', unit.value !== '時間単位'); touch(); };
      date.onchange = () => { refreshNote(); touch(); };
      reason.oninput = touch;
      refreshUnits();

      submit.onclick = async () => {
        touch();
        msg.innerHTML = '';
        submit.disabled = true;
        try {
          const r = await kintaiApi('leaveApply', Object.assign({}, auth, {
            date: date.value, kind: kind.value, unit: unit.value, hours: hours.value, reason: reason.value,
          }));
          msg.appendChild(el('div', { class: 'msg ok', text: r.message }));
          reason.value = '';
          renderList(r.items);
        } catch (e) {
          msg.appendChild(el('div', { class: 'msg err', text: e.message }));
        } finally {
          submit.disabled = false;
        }
      };

      root.appendChild(el('p', { class: 'muted', text: `${data.name} さん` }));
      root.appendChild(el('label', { text: '取得日' }));
      root.appendChild(date);
      root.appendChild(note);
      root.appendChild(el('label', { text: '種類' }));
      root.appendChild(kind);
      root.appendChild(el('label', { text: '単位' }));
      root.appendChild(unit);
      root.appendChild(hoursWrap);
      root.appendChild(el('label', { text: '理由（任意）' }));
      root.appendChild(reason);
      root.appendChild(submit);
      root.appendChild(msg);

      const listBox = el('div', { class: 'leave-list' });
      root.appendChild(el('p', { class: 'name', text: '申請の状況' }));
      root.appendChild(listBox);
      root.appendChild(backButton());

      function renderList(items) {
        listBox.innerHTML = '';
        if (!items.length) {
          listBox.appendChild(el('p', { class: 'muted', text: '最近の申請はありません' }));
          return;
        }
        items.forEach(it => {
          const what = `${it.kind}・${it.unit === '時間単位' ? it.hours + '時間' : it.unit}`;
          const row = el('div', { class: 'leave-item' }, [
            el('div', {}, [
              el('div', { text: fmtDate(it.date) }),
              el('div', { class: 'muted', text: what + (it.kubun === '事後' ? '（後日申請）' : '') }),
            ]),
            el('span', { class: 'badge ' + (STATUS_CLASS[it.status] || ''), text: it.status }),
          ]);
          if (it.status === '申請中') {
            const c = el('button', { class: 'b-link', text: '取消' });
            c.onclick = async () => {
              touch();
              if (!confirm(`${fmtDate(it.date)} の申請を取り消しますか？`)) return;
              try {
                const r = await kintaiApi('leaveCancel', Object.assign({}, auth, { id: it.id }));
                renderList(r.items);
              } catch (e) {
                alert(e.message);
              }
            };
            row.appendChild(c);
          }
          listBox.appendChild(row);
        });
      }
      renderList(data.items);
    }
  }

  return { open };
})();
