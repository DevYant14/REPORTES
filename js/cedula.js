// Validación de cédula ecuatoriana (10 dígitos, módulo 10).
RC.cedulaValida = function (c) {
  if (!/^\d{10}$/.test(c)) return false;
  const prov = +c.slice(0, 2);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;
  if (+c[2] > 5) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) { let v = +c[i] * (i % 2 ? 1 : 2); if (v > 9) v -= 9; s += v; }
  return (10 - (s % 10)) % 10 === +c[9];
};
RC.mascara = c => c.slice(0, 3) + "****" + c.slice(-3);
