# Reporta tu Ciudad

Reportes ciudadanos (baches, alumbrado, basura…) con ingreso por cédula, verificación de fotos y seguimiento de estado.

## Estructura
```
index.html        App (shell)
mockup.html       Mockup 1: las 4 pantallas principales
css/tokens.css    Variables de tema (nombres de shadcn/ui y 21st.dev)
css/components.css  Button, Card, Badge, Input, Tabs, Alert, Stepper
css/app.css       Layout propio de la app
js/config.js      Estados, categorías, admins, URL del verificador
js/cedula.js      Validación de cédula ecuatoriana
js/storage.js     Datos (localStorage en demo; cámbialo por tu API)
js/verify.js      Verificación de fotos
js/app.js         Pantallas y lógica
```
Abre `index.html` con doble clic. No necesita instalar nada.

## Sobre 21st.dev
21st.dev es un registro de componentes **React + Tailwind + shadcn/ui**. Este proyecto es HTML/CSS/JS plano, así que no
puede instalar sus componentes directamente. Lo que sí hace: usa los **mismos tokens y la misma anatomía** de shadcn/ui
(Button, Card, Badge, Input, Tabs, Alert) y un stepper para el seguimiento, para que se vea igual y la migración sea directa.

Para usar los componentes originales de 21st.dev:
1. Crea un proyecto: `npm create vite@latest reporta -- --template react-ts`, agrega Tailwind y ejecuta `npx shadcn@latest init`.
2. Pega las variables de `css/tokens.css` en tu `globals.css`.
3. Elige los componentes en 21st.dev e instálalos con `npx shadcn@latest add "https://21st.dev/r/<autor>/<componente>"`
   (la URL exacta aparece en cada componente). Busca: *login form*, *file upload / dropzone*, *stepper o timeline*, *badge* y *data table* (panel municipal).
4. Reutiliza `cedula.js`, `storage.js` y `verify.js` como módulos TypeScript.

## Antes de publicarlo de verdad
- **Login y datos:** hoy todo vive en el navegador (`localStorage`). Para uso real necesitas un servidor con base de datos,
  contraseñas con bcrypt/argon2, sesiones/JWT y cumplimiento de la ley de protección de datos personales de Ecuador.
- **Roles:** `adminCedulas` en `config.js` es solo demostración; el rol de administrador debe validarse en el servidor.
- **Fotos reales vs falsas:** sin servidor solo hay comprobaciones básicas (tamaño, imagen uniforme, foto repetida).
  Para detección real conecta `verifyEndpoint` a tu backend, que llame a un modelo de visión (con la API key guardada en el servidor)
  y devuelva `{ veredicto, confianza, motivo }`. Ninguna verificación es infalible: deja la revisión humana para las “dudosas”.
