# Rosy Music Bot

Bot de música para Discord, construido con Discord.js y Lavalink. Reproduce canciones desde YouTube y YouTube Music con cola, controles de volumen y comandos de barra.

## Inicio rápido

```bash
npm install
npm start
```

La primera vez, el launcher solicita el **TOKEN** de Discord, el **CLIENT_ID** y la contraseña de Lavalink (por defecto `rosy-local`). En ejecuciones siguientes usa los valores guardados en `.env`.

## Requisitos

- [Node.js](https://nodejs.org/) 18.17.0 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Una aplicación en [Discord Developer Portal](https://discord.com/developers/applications)

## Instalación

### 1. Clonar y preparar

```bash
git clone <url-del-repositorio>
cd Rosy-Music-Bot
npm install
```

### 2. Primera ejecución

```bash
npm start
```

El launcher hace en secuencia:

1. **TOKEN** — si no está en `.env`, pide el token y lo guarda.
2. **CLIENT_ID** — necesario para registrar comandos de barra. Lo encuentras en Discord Developer Portal > tu app > General Information.
3. **LAVALINK_PASSWORD** — presiona Enter para usar `rosy-local` o ingresa una contraseña propia.
4. **Docker** — verifica que Docker Desktop esté corriendo e inicia Lavalink.
5. **Perfil** — sincroniza automáticamente el perfil público del bot con Discord (description, tags, install_params).
6. **Bot** — inicia el bot de Discord.

### 3. Registrar comandos de barra

Los comandos slash (`/play`, `/queue`, etc.) no se despliegan automáticamente. Cada vez que agregues o modifiques un comando, ejecuta:

```bash
npm run deploy:commands
```

> **Nota:** `npm start` solo sincroniza el perfil público del bot; no despliega comandos de barra.

## Docker en distintos sistemas

El bot usa `docker compose` para ejecutar Lavalink. Funciona igual en Windows, Linux y macOS.

| Sistema | Requisito |
|---------|-----------|
| Windows | Docker Desktop abierto antes de `npm start` |
| Linux | Docker Desktop o servicio Docker activo (`sudo systemctl start docker`) |
| macOS | Docker Desktop abierto |

Si Docker no está disponible, el launcher ofrece un **modo manual** que inicia el bot sin Lavalink. La reproducción de música no funcionará en ese modo.

## Configuración manual con `.env`

Crea un archivo `.env` en la raíz del proyecto:

```env
TOKEN=tu_token_de_discord
CLIENT_ID=tu_application_id
LAVALINK_HOST=localhost
LAVALINK_PORT=23333
LAVALINK_PASSWORD=rosy-local
```

Si el archivo `.env` existe con todos los valores, el wizard interactivo no aparece.

## Perfil público del bot (`perfil.js`)

El archivo `perfil.js` controla la información visible en la ficha de tu aplicación en Discord:

- **description** — texto bajo el nombre del bot
- **tags** — hasta 5 etiquetas cortas (ej. music, entertainment)
- **install_params** — scopes y permisos del botón "Añadir a la App"
- **presence_messages** — mensajes rotativos del status

El perfil se sincroniza **automáticamente cada vez que ejecutas `npm start`**.

Para actualizar solo el perfil sin iniciar el bot:

```bash
npm run profile:update
```

> Los emojis de servidor personalizados (tipo `<a:nombre:id>`) pueden no ser confiables en la descripción de la aplicación. Usa emojis Unicode si necesitas iconografía en la descripción.

## Comandos

| Comando | Descripción |
|---------|-------------|
| `/play <canción>` | Reproduce una canción (URL o nombre) |
| `/pause` | Pausa la reproducción |
| `/resume` | Reanuda la reproducción |
| `/skip` | Salta a la siguiente canción |
| `/stop` | Detiene la reproducción y limpia la cola |
| `/queue` | Muestra la cola de reproducción |
| `/volume <1-100>` | Ajusta el volumen |
| `/lyrics [canción]` | Muestra la letra de la canción actual o de una búsqueda |

## Solución de problemas

### `npm start` termina con error de TOKEN

```bash
# Windows (PowerShell)
$env:TOKEN="tu_token"; npm start

# Linux/macOS
TOKEN=tu_token npm start
```

O edita directamente tu archivo `.env` y agrega la línea:

```
TOKEN=tu_token_de_discord
```

---

### El bot no reproduce música

1. Verifica que Lavalink esté corriendo:

```bash
docker ps
```

2. Revisa los logs de Lavalink:

```bash
docker compose logs lavalink
```

3. Verifica que el token en `.env` sea correcto.

---

### Comandos duplicados en Discord

Si ves un comando (ej. `/pause`) repetido con descripciones diferentes, tienes comandos tanto **globales** como **guild-scoped** con el mismo nombre.

**Limpiar comandos del guild:**

```bash
# Opción 1: script dedicado
node scripts/clear-guild-commands.js --guild=TU_GUILD_ID

# Opción 2: dentro de deploy-commands
node scripts/deploy-commands.js --clear-guild --guild=TU_GUILD_ID
```

Esto elimina los comandos del guild sin tocar los globales. Discord puede tardar hasta 1 hora en propagar el cambio.

---

### Docker no responde

```bash
# Verificar estado de Docker
docker ps

# Abrir Docker Desktop manualmente
# En Linux:
sudo systemctl start docker

# Reiniciar el launcher
npm start
```

---

### Puerto 23333 ya está en uso

Configura otro puerto en `.env`:

```
LAVALINK_PORT=23334
```

Luego reinicia con `npm start`.

---

### Modo manual: Lavalink no disponible

Si elegiste modo manual o Docker no estaba disponible, el bot inicia sin Lavalink y los comandos de música no funcionarán. Abre Docker Desktop y vuelve a ejecutar `npm start`.

## Rollback

Si el bot deja de funcionar después de una actualización:

```bash
git checkout HEAD~1
npm install
npm start
```

## Créditos

Desarrollado por GatuzoCXL
