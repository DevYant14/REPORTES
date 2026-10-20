(function () {
  const $ = s => document.querySelector(s), view = $("#view"), who = $("#who");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = t => new Date(t).toLocaleDateString("es-EC");
  let me = null, tab = "nuevo", reports = [], photo = null;
  try { me = JSON.parse(sessionStorage.getItem("rc_me")); } catch {}
  const isAdmin = () => me && RC.config.adminCedulas.includes(me.ced);

  async function render() {
    who.innerHTML = me ? `<span class="muted">${esc(me.name)} · CI ${RC.mascara(me.ced)}</span><button class="btn btn-outline btn-sm" id="out">Salir</button>` : "";
    if (me) $("#out").onclick = () => { me = null; sessionStorage.removeItem("rc_me"); render(); };
    if (!me) return authView();
    reports = await RC.db.listReports();
    const tabs = [["nuevo", "Nuevo reporte"], ["mios", "Mis reportes"], ["todos", "Todos"]];
    if (isAdmin()) tabs.push(["admin", "Panel municipal"]);
    view.innerHTML = `<div class="tabs" role="tablist">${tabs.map(t => `<button class="tab" role="tab" aria-selected="${tab === t[0]}" data-t="${t[0]}">${t[1]}</button>`).join("")}</div><div id="body"></div>`;
    view.querySelectorAll(".tab").forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    if (tab === "nuevo") newView();
    else list(tab === "mios" ? reports.filter(r => r.ced === me.ced) : reports, tab === "admin");
  }

  function note(id, text, kind) { const e = $(id); e.className = "alert alert-" + kind; e.textContent = text; }

  function authView() {
    view.innerHTML = `<section class="card" style="max-width:26rem;margin:2rem auto"><div class="card-header"><h1 class="card-title">Entra para reportar</h1><p class="card-desc">Usa tu cédula y una contraseña. Si es tu primera vez, crea tu cuenta.</p></div>
    <form class="card-body" id="f" novalidate>
      <label class="label" for="ced">Cédula</label><input class="input" id="ced" inputmode="numeric" maxlength="10" autocomplete="username">
      <label class="label" for="pw">Contraseña</label><input class="input" id="pw" type="password" autocomplete="current-password"><p class="hint">Mínimo 8 caracteres.</p>
      <div id="nm" class="hidden"><label class="label" for="name">Nombre completo</label><input class="input" id="name" autocomplete="name"></div>
      <div class="row" style="margin-top:1.25rem"><button class="btn" id="in" type="submit">Ingresar</button><button class="btn btn-outline" id="reg" type="button">Crear cuenta</button></div>
      <div id="m" class="alert alert-info hidden"></div></form></section>`;
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
    $("#body").innerHTML = `<section class="card"><div class="card-header"><h1 class="card-title">Reportar un problema</h1><p class="card-desc">Sube una foto real tomada en el lugar. La revisamos antes de enviarla.</p></div>
    <form class="card-body" id="nf" novalidate>
      <label class="label" for="cat">Tipo de problema</label><select class="select" id="cat">${Object.entries(RC.CATEGORIAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
      <label class="label" for="loc">Dónde está</label><input class="input" id="loc" placeholder="Calle, barrio y una referencia">
      <div class="row" style="margin-top:.5rem"><button class="btn btn-outline btn-sm" type="button" id="gps">Usar mi ubicación</button><span class="muted" id="gp"></span></div>
      <label class="label" for="desc">Qué pasa</label><textarea class="textarea" id="desc" rows="3"></textarea>
      <label class="label" for="ph">Foto del daño</label><input class="input" id="ph" type="file" accept="image/*" capture="environment">
      <img id="pv" class="preview hidden" alt="Vista previa de la foto">
      <div class="row" style="margin-top:1.25rem"><button class="btn" id="go" type="submit">Verificar y enviar reporte</button></div>
      <div id="m" class="alert alert-info hidden"></div></form></section>`;
    let coords = null; photo = null;
    $("#gps").onclick = () => navigator.geolocation?.getCurrentPosition(p => { coords = [p.coords.latitude, p.coords.longitude]; $("#gp").textContent = "Ubicación guardada"; }, () => { $("#gp").textContent = "No se pudo obtener el GPS"; });
    $("#ph").onchange = e => { const f = e.target.files[0]; if (!f) return; const img = new Image();
      img.onload = () => { const k = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = img.width * k; c.height = img.height * k; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => { photo = { blob: b, img, url: c.toDataURL("image/jpeg", .72) }; const p = $("#pv"); p.src = photo.url; p.classList.remove("hidden"); }, "image/jpeg", .72); };
      img.src = URL.createObjectURL(f); };
    $("#nf").onsubmit = async e => { e.preventDefault();
      const categoria = $("#cat").value, loc = $("#loc").value.trim(), desc = $("#desc").value.trim();
      if (!loc || !desc || !photo) return note("#m", "Completa la ubicación, la descripción y la foto.", "error");
      $("#go").disabled = true; note("#m", "Revisando la foto…", "info");
      try {
        const v = await RC.verificar({ blob: photo.blob, img: photo.img, categoria, descripcion: desc, previos: reports.map(r => r.ver || {}) });
        if (v.veredicto === "falsa") { $("#go").disabled = false; return note("#m", "Foto rechazada: " + v.motivo + " Sube una foto real del problema.", "error"); }
        await RC.db.addReport({ ced: me.ced, cat: categoria, loc, desc, coords, foto: photo.url, ver: v });
        tab = "mios"; render();
      } catch (err) { $("#go").disabled = false; note("#m", err.message, "error"); }
    };
  }

  const VER = { real: ["Foto verificada", "--success"], dudosa: ["Foto por revisar", "--warning"] };
  function list(rs, adm) {
    if (!rs.length) { $("#body").innerHTML = `<div class="card empty">Todavía no hay reportes. Crea el primero desde “Nuevo reporte”.</div>`; return; }
    $("#body").innerHTML = `<div class="stack">${rs.map(r => {
      const i = RC.ESTADOS.findIndex(s => s.id === r.estado), s = RC.ESTADOS[i], v = VER[(r.ver || {}).veredicto] || VER.dudosa;
      return `<article class="card report"><img src="${esc(r.foto)}" alt="Foto del reporte"><div>
        <h3>${esc(RC.CATEGORIAS[r.cat])}</h3><p class="muted" style="margin:.1rem 0 .5rem">${esc(r.loc)} · ${fmt(r.ts)}</p><p style="margin:0 0 .6rem">${esc(r.desc)}</p>
        <div class="row"><span class="badge" style="--c:hsl(var(${s.color}))">${s.label}</span><span class="badge" style="--c:hsl(var(${v[1]}))" title="${esc((r.ver || {}).motivo)}">${v[0]}</span></div></div>
        <div style="grid-column:1/-1"><div class="stepper">${RC.ESTADOS.map((x, k) => `<div class="step ${k <= i ? "done" : ""}">${x.label}</div>`).join("")}</div>
        <p class="muted" style="margin:.25rem 0 0">${r.hist.map(h => RC.ESTADOS.find(x => x.id === h.e).label + " " + fmt(h.t)).join(" → ")}</p>
        ${adm ? `<label class="label" for="s${r.id}">Cambiar estado</label><select class="select" id="s${r.id}" data-id="${r.id}">${RC.ESTADOS.map(x => `<option value="${x.id}" ${x.id === r.estado ? "selected" : ""}>${x.label}</option>`).join("")}</select>` : ""}</div></article>`;
    }).join("")}</div>`;
    document.querySelectorAll("select[data-id]").forEach(s => s.onchange = async () => { await RC.db.setEstado(s.dataset.id, s.value); render(); });
  }
  render();
})();
