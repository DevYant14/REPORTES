// Verificación de fotos.
// 1) Si config.verifyEndpoint existe, envía la foto a tu backend (donde va la llamada a un modelo de visión
//    con tu API key; NUNCA pongas la clave en el navegador). Contrato esperado:
//    POST multipart: foto, categoria, descripcion  ->  { veredicto: "real"|"dudosa"|"falsa", confianza: 0-100, motivo: "..." }
// 2) Si no, aplica comprobaciones locales básicas (foto muy pequeña, casi uniforme, o repetida).
(function () {
  function pixels(img, n) {
    const c = document.createElement("canvas"); c.width = c.height = n;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0, n, n);
    return x.getImageData(0, 0, n, n).data;
  }
  function ahash(img) {
    const d = pixels(img, 8), g = [];
    for (let i = 0; i < d.length; i += 4) g.push((d[i] + d[i + 1] + d[i + 2]) / 3);
    const m = g.reduce((a, b) => a + b) / g.length;
    return g.map(v => (v > m ? 1 : 0)).join("");
  }
  const dist = (a, b) => [...a].filter((ch, i) => ch !== b[i]).length;

  RC.verificar = async function ({ blob, img, categoria, descripcion, previos }) {
    if (RC.config.verifyEndpoint) {
      const fd = new FormData(); fd.append("foto", blob); fd.append("categoria", categoria); fd.append("descripcion", descripcion);
      const r = await fetch(RC.config.verifyEndpoint, { method: "POST", body: fd });
      if (!r.ok) throw new Error("El servicio de verificación no respondió.");
      return r.json();
    }
    const hash = ahash(img);
    if (img.naturalWidth < 300 || img.naturalHeight < 300)
      return { veredicto: "falsa", confianza: 70, motivo: "La imagen es demasiado pequeña para ser una foto tomada en el lugar.", hash };
    const d = pixels(img, 32); let s = 0, s2 = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; s += v; s2 += v * v; }
    if (Math.sqrt(s2 / n - (s / n) ** 2) < 8)
      return { veredicto: "falsa", confianza: 75, motivo: "La imagen es casi uniforme y no muestra ningún daño.", hash };
    if (previos.some(p => p.hash && dist(p.hash, hash) <= 4))
      return { veredicto: "dudosa", confianza: 60, motivo: "Esta foto es casi idéntica a la de otro reporte.", hash };
    return { veredicto: "dudosa", confianza: 40, motivo: "Pasó las comprobaciones básicas; falta verificación con IA o revisión humana.", hash };
  };
})();
