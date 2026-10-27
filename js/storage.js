(function () {
  const K = { u: "rc_users", r: "rc_reports" };
  const read = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const rnd = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, "0")).join("");
  async function hash(pw, salt) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pw));
    return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, "0")).join("");
  }
  RC.db = {
    async register(ced, name, pw) {
      const u = read(K.u); if (u[ced]) throw new Error("Esa cédula ya tiene cuenta.");
      const salt = rnd(); u[ced] = { name, salt, h: await hash(pw, salt), ts: Date.now() }; write(K.u, u);
    },
    async login(ced, pw) {
      const x = read(K.u)[ced]; if (!x) throw new Error("No existe una cuenta con esa cédula.");
      if (await hash(pw, x.salt) !== x.h) throw new Error("Contraseña incorrecta.");
      return { ced, name: x.name };
    },
    async listReports() { return Object.values(read(K.r)).sort((a, b) => b.ts - a.ts); },
    async addReport(r) {
      const all = read(K.r), id = rnd();
      all[id] = { ...r, id, estado: "enviado", ts: Date.now(), hist: [{ e: "enviado", t: Date.now() }] };
      write(K.r, all);
    },
    async setEstado(id, e) {
      const all = read(K.r), r = all[id]; if (!r || r.estado === e) return;
      r.estado = e; r.hist.push({ e, t: Date.now() }); write(K.r, all);
    }
  };
})();
