(function () {
  const $ = s => document.querySelector(s), view = $("#view"), who = $("#who");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = t => new Date(t).toLocaleDateString("es-EC");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const initials = n => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const ICON = {
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    cam: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>`
  };
  let me = null, tab = "nuevo", reports = [], photo = null, prevInd = null;
  try { me = JSON.parse(sessionStorage.getItem("rc_me")); } catch {}
  const isAdmin = () => me && RC.config.adminCedulas.includes(me.ced);

  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status");
    t.innerHTML = `<i>✓</i><span>${esc(msg)}</span>`; document.body.appendChild(t);
    setTimeout(() => t.remove(), 3300);
  }

  // Indicador de las pestañas: se desliza desde la pestaña anterior a la nueva.
  function moveInd() {
    const bar = view.querySelector(".tabs"), ind = bar && bar.querySelector(".tab-ind"), sel = bar && bar.querySelector('[aria-selected="true"]');
    if (!ind || !sel) return;
    const to = { l: sel.offsetLeft, t: sel.offsetTop, w: sel.offsetWidth, h: sel.offsetHeight }, from = prevInd || to;
    const set = p => { ind.style.transform = `translate(${p.l}px,${p.t}px)`; ind.style.width = p.w + "px"; ind.style.height = p.h + "px"; };
    ind.style.transition = "none"; set(from); ind.getBoundingClientRect(); ind.style.transition = ""; set(to);
    prevInd = to;
  }

  // Números que suben hasta su valor.
  function countUp(root) {
    root.querySelectorAll("[data-to]").forEach(el => {
      const to = +el.dataset.to; if (reduce || !to) { el.textContent = to; return; }
      const t0 = performance.now(), d = 800;
      (function step(t) { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(t0);
    });
  }

  async function render() {
    view.classList.toggle("wide", !me);
    who.innerHTML = me ? `<span class="avatar" aria-hidden="true">${esc(initials(me.name))}</span><span class="muted who-name">${esc(me.name)} · CI ${RC.mascara(me.ced)}</span><button class="btn btn-outline btn-sm" id="out">Salir</button>` : "";
    if (me) $("#out").onclick = () => { me = null; prevInd = null; sessionStorage.removeItem("rc_me"); render(); };
    if (!me) return authView();
    reports = await RC.db.listReports();
    const tabs = [["nuevo", "Nuevo reporte"], ["mios", "Mis reportes"], ["todos", "Todos"]];
    if (isAdmin()) tabs.push(["admin", "Panel municipal"]);
    view.innerHTML = `<div class="tabs" role="tablist"><span class="tab-ind"></span>${tabs.map(t => `<button class="tab" role="tab" aria-selected="${tab === t[0]}" data-t="${t[0]}">${t[1]}</button>`).join("")}</div><div id="body"></div>`;
    view.querySelectorAll(".tab").forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    moveInd();
    if (tab === "nuevo") newView();
    else list(tab === "mios" ? reports.filter(r => r.ced === me.ced) : reports, tab === "admin");
  }

  function note(id, text, kind) {
    const e = $(id); e.className = "alert alert-" + kind + (kind === "info" && text.endsWith("…") ? " loading" : ""); e.textContent = text;
  }

  function authView() {
    view.innerHTML = `<section class="auth">
      <div class="auth-hero">
        <img class="auth-logo float reveal" src="logo.png" alt="Reporta tu Ciudad">
        <h1 class="reveal" style="--i:1">Tu reporte ayuda a arreglar la calle</h1>
        <p class="reveal" style="--i:2">Sube una foto del problema, sigue su estado paso a paso y mira cuándo lo repara el municipio.</p>
        <ul class="auth-points reveal" style="--i:3">
          <li>${ICON.check}Revisamos la foto antes de enviar</li>
          <li>${ICON.check}Cuatro estados, de Enviado a Arreglado</li>
          <li>${ICON.check}Tu cédula siempre se muestra oculta</li>
        </ul>
      </div>
      <div class="card auth-card reveal" style="--i:2"><div class="card-header"><h2 class="card-title">Entra para reportar</h2><p class="card-desc">Usa tu cédula y una contraseña. Si es tu primera vez, crea tu cuenta.</p></div>
      <form class="card-body" id="f" novalidate>
        <label class="label" for="ced">Cédula</label><input class="input" id="ced" inputmode="numeric" maxlength="10" autocomplete="username">
        <label class="label" for="pw">Contraseña</label><input class="input" id="pw" type="password" autocomplete="current-password"><p class="hint">Mínimo 8 caracteres.</p>
        <div id="nm" class="hidden"><label class="label" for="name">Nombre completo</label><input class="input" id="name" autocomplete="name"></div>
        <div class="row" style="margin-top:1.25rem"><button class="btn" id="in" type="submit">Ingresar</button><button class="btn btn-outline" id="reg" type="button">Crear cuenta</button></div>
        <div id="m" class="alert alert-info hidden"></div></form></div></section>`;
    const val = () => { const ced = $("#ced").value.trim(), pw = $("#pw").value;
      if (!RC.cedulaValida(ced)) { note("#m", "La cédula no es válida. Revisa los 10 dígitos.", "error"); return null; }
      if (pw.length < 8) { note("#m", "La contraseña necesita al menos 8 caracteres.", "error"); return null; }
      return { ced, pw }; };
    const go = async fn => { try { await fn(); } catch (e) { note("#m", e.message, "error"); } };
    const enter = u => { me = u; sessionStorage.setItem("rc_me", JSON.stringify(u)); render(); };
    $("#f").onsubmit = e => { e.preventDefault(); const v = val(); if (v) go(async () => enter(await RC.db.login(v.ced, v.pw))); };
    $("#reg").onclick = () => { $("#nm").classList.remove("hidden"); const v = val(), name = $("#name").value.trim();
      if (!v) return; if (!name) return note("#m", "Escribe tu nombre para crear la cuenta.", "error");
      go(async () => { await RC.db.register(v.ced, name, v.pw); enter({ ced: v.ced, name }); }); };
  }

  function newView() {
    $("#body").innerHTML = `<section class="card reveal"><div class="card-header"><h1 class="card-title">Reportar un problema</h1><p class="card-desc">Sube una foto real tomada en el lugar. La revisamos antes de enviarla.</p></div>
    <form class="card-body" id="nf" novalidate>
      <label class="label" for="cat">Tipo de problema</label><select class="select" id="cat">${Object.entries(RC.CATEGORIAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
      <label class="label" for="loc">Dónde está</label><input class="input" id="loc" placeholder="Calle, barrio y una referencia">
      <div class="row" style="margin-top:.5rem"><button class="btn btn-outline btn-sm" type="button" id="gps">Usar mi ubicación</button><span class="muted" id="gp"></span></div>
      <label class="label" for="desc">Qué pasa</label><textarea class="textarea" id="desc" rows="3"></textarea>
      <label class="label" for="ph">Foto del daño</label>
      <label class="dropzone" id="dz" for="ph"><span class="dz-icon">${ICON.cam}</span><span><strong id="dzt">Toma o sube una foto</strong><span class="muted">Arrastra una imagen aquí o toca para elegirla</span></span></label>
      <input class="sr-only" id="ph" type="file" accept="image/*" capture="environment">
      <img id="pv" class="preview hidden" alt="Vista previa de la foto">
      <div class="row" style="margin-top:1.25rem"><button class="btn" id="go" type="submit">Verificar y enviar reporte</button></div>
      <div id="m" class="alert alert-info hidden"></div></form></section>`;
    let coords = null; photo = null;
    $("#gps").onclick = () => navigator.geolocation?.getCurrentPosition(p => { coords = [p.coords.latitude, p.coords.longitude]; $("#gp").textContent = "Ubicación guardada"; }, () => { $("#gp").textContent = "No se pudo obtener el GPS"; });
    const take = f => { if (!f || !f.type.startsWith("image/")) return; const img = new Image();
      img.onload = () => { const k = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = img.width * k; c.height = img.height * k; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => { photo = { blob: b, img, url: c.toDataURL("image/jpeg", .72) }; const p = $("#pv"); p.src = photo.url; p.classList.remove("hidden");
          $("#dz").classList.add("has-file"); $("#dzt").textContent = f.name; }, "image/jpeg", .72); };
      img.src = URL.createObjectURL(f); };
    $("#ph").onchange = e => take(e.target.files[0]);
    const dz = $("#dz");
    ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("drag"); }));
    dz.addEventListener("drop", e => take(e.dataTransfer.files[0]));
    $("#nf").onsubmit = async e => { e.preventDefault();
      const categoria = $("#cat").value, loc = $("#loc").value.trim(), desc = $("#desc").value.trim();
      if (!loc || !desc || !photo) return note("#m", "Completa la ubicación, la descripción y la foto.", "error");
      $("#go").disabled = true; note("#m", "Revisando la foto…", "info");
      try {
        const v = await RC.verificar({ blob: photo.blob, img: photo.img, categoria, descripcion: desc, previos: reports.map(r => r.ver || {}) });
        if (v.veredicto === "falsa") { $("#go").disabled = false; return note("#m", "Foto rechazada: " + v.motivo + " Sube una foto real del problema.", "error"); }
        await RC.db.addReport({ ced: me.ced, cat: categoria, loc, desc, coords, foto: photo.url, ver: v });
        tab = "mios"; await render(); toast("Reporte enviado. Ya puedes seguir su estado.");
      } catch (err) { $("#go").disabled = false; note("#m", err.message, "error"); }
    };
  }

  const VER = { real: ["Foto verificada", "--success"], dudosa: ["Foto por revisar", "--warning"] };
  function list(rs, adm) {
    if (!rs.length) { $("#body").innerHTML = `<div class="card empty reveal"><img class="float" src="logo.png" alt=""><p>Todavía no hay reportes.<br>Crea el primero desde “Nuevo reporte”.</p></div>`; return; }
    const stats = (tab === "todos" || adm) ? `<div class="stats">${[
      ["Reportes", rs.length, "--primary"],
      ["En reparación", rs.filter(r => r.estado === "proceso").length, "--warning"],
      ["Arreglados", rs.filter(r => r.estado === "arreglado").length, "--success"]
    ].map((s, n) => `<div class="card stat reveal" style="--i:${n}"><div class="stat-n" style="color:hsl(var(${s[2]}))" data-to="${s[1]}">0</div><div class="stat-l">${s[0]}</div></div>`).join("")}</div>` : "";
    $("#body").innerHTML = stats + `<div class="stack">${rs.map((r, n) => {
      const i = RC.ESTADOS.findIndex(s => s.id === r.estado), s = RC.ESTADOS[i], v = VER[(r.ver || {}).veredicto] || VER.dudosa;
      return `<article class="card report reveal" style="--i:${Math.min(n, 8) + 2}"><div class="thumb"><img src="${esc(r.foto)}" alt="Foto del reporte"></div><div>
        <h3>${esc(RC.CATEGORIAS[r.cat])}</h3><p class="muted" style="margin:.1rem 0 .5rem">${esc(r.loc)} · ${fmt(r.ts)}</p><p style="margin:0 0 .6rem">${esc(r.desc)}</p>
        <div class="row"><span class="badge${r.estado === "arreglado" ? "" : " live"}" style="--c:hsl(var(${s.color}))">${s.label}</span><span class="badge" style="--c:hsl(var(${v[1]}))" title="${esc((r.ver || {}).motivo)}">${v[0]}</span></div></div>
        <div style="grid-column:1/-1"><div class="stepper">${RC.ESTADOS.map((x, k) => `<div class="step ${k <= i ? "done" : ""} ${k === i ? "current" : ""}" style="--k:${k}">${x.label}</div>`).join("")}</div>
        <p class="muted" style="margin:.25rem 0 0">${r.hist.map(h => RC.ESTADOS.find(x => x.id === h.e).label + " " + fmt(h.t)).join(" → ")}</p>
        ${adm ? `<label class="label" for="s${r.id}">Cambiar estado</label><select class="select" id="s${r.id}" data-id="${r.id}">${RC.ESTADOS.map(x => `<option value="${x.id}" ${x.id === r.estado ? "selected" : ""}>${x.label}</option>`).join("")}</select>` : ""}</div></article>`;
    }).join("")}</div>`;
    countUp($("#body"));
    document.querySelectorAll("select[data-id]").forEach(s => s.onchange = async () => { await RC.db.setEstado(s.dataset.id, s.value); await render(); toast("Estado actualizado"); });
  }
  render();
})();