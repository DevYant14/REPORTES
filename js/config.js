window.RC = {
  config: {
    // Cédulas con acceso al panel municipal (DEMO: en producción el rol viene del servidor).
    adminCedulas: ["1231231232"],
    // URL de tu backend que verifica fotos con IA (ver README). Vacío = verificación local básica.
    verifyEndpoint: ""
  },
  ESTADOS: [
    { id: "enviado",   label: "Enviado",    color: "--muted-foreground" },
    { id: "leido",     label: "Leído",      color: "--info" },
    { id: "proceso",   label: "En reparación", color: "--warning" },
    { id: "arreglado", label: "Arreglado",  color: "--success" }
  ],
  CATEGORIAS: {
    bache: "Bache o vía dañada", alumbrado: "Alumbrado público", basura: "Basura o escombros",
    agua: "Fuga de agua o alcantarilla", senal: "Señalización dañada", otro: "Otro"
  }
};
