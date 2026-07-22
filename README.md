# 🍼 Baby Shower · Lista de Regalos

App en **React + Vite** con un formulario estilo **Google Forms** donde cada
invitado elige el regalo que va a llevar. Las reservas se guardan en una hoja de
**Google Sheets** (la mini base de datos) a través de **Google Apps Script**.

Así nadie repite regalo: cuando alguien reserva uno, se marca como tomado.

---

## 🚀 Poner en marcha

### 1. Instalar y correr el frontend

```bash
npm install
npm run dev
```

Abre la URL que muestra la terminal (por defecto http://localhost:5173).

### 2. Crear la base de datos (Google Sheets)

1. Crea una hoja nueva en [Google Sheets](https://sheets.new).
2. En la **fila 1** pon estos encabezados exactos:

   | regalo | tomado | nombre | telefono | mensaje |
   | ------ | ------ | ------ | -------- | ------- |

3. De la fila 2 en adelante escribe **un regalo por fila** en la columna
   `regalo`. Deja las demás columnas vacías. Ejemplo:

   | regalo            | tomado | nombre | telefono | mensaje |
   | ----------------- | ------ | ------ | -------- | ------- |
   | Pañales etapa 1   |        |        |          |         |
   | Biberones         |        |        |          |         |
   | Ropa 0-3 meses    |        |        |          |         |
   | Cobija            |        |        |          |         |

### 3. Conectar el backend (Apps Script)

1. En la hoja: **Extensiones → Apps Script**.
2. Borra el contenido y pega todo el archivo
   [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. **Implementar → Nueva implementación → Aplicación web**:
   - **Ejecutar como:** Yo
   - **Quién tiene acceso:** Cualquier usuario
4. Copia la **URL** que termina en `/exec`.

### 4. Conectar el frontend con el backend

Pega esa URL en [`src/config.js`](src/config.js):

```js
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXX/exec";
```

Guarda y recarga. ¡Listo! Los regalos de tu hoja aparecerán en el formulario.

---

## 🧩 Cómo funciona

- **GET** a la URL → devuelve la lista de regalos (`{ regalos: [...] }`).
- **POST** a la URL → reserva un regalo y escribe nombre, teléfono y mensaje en
  la fila correspondiente. Usa un _lock_ para que dos personas no reserven el
  mismo regalo a la vez.
- El `id` de cada regalo es su número de fila en la hoja.

## 📁 Estructura

```
src/
  BabyShower.jsx   → componente principal (formulario + lógica)
  styles.css       → estilos tipo Google Forms (tema pastel)
  config.js        → aquí va la URL del Apps Script
google-apps-script/
  Code.gs          → backend que lee/escribe en Google Sheets
```

## 🏗️ Producción

```bash
npm run build      # genera /dist
npm run preview    # sirve /dist localmente
```

Puedes subir la carpeta `dist/` a cualquier hosting estático (Netlify, Vercel,
GitHub Pages, etc.).
