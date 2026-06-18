<div align="center">

# Rosy Music Bot

### Discord music bot powered by Discord.js, Lavalink and Docker

![Node.js](https://img.shields.io/badge/Node.js-0F172A?style=for-the-badge&logo=node.js&logoColor=5FA04E)
![Discord.js](https://img.shields.io/badge/Discord.js-0F172A?style=for-the-badge&logo=discord&logoColor=5865F2)
![Lavalink](https://img.shields.io/badge/Lavalink-0F172A?style=for-the-badge&logo=youtube&logoColor=FF0000)
![Docker](https://img.shields.io/badge/Docker-0F172A?style=for-the-badge&logo=docker&logoColor=2496ED)
![License MIT](https://img.shields.io/badge/License-MIT-0F172A?style=for-the-badge)

</div>

---

## Overview

**Rosy Music Bot** is a Discord music bot built with **Discord.js** and **Lavalink**.

It can play music from YouTube and YouTube Music, manage playback queues, control volume, display lyrics and use modern Discord slash commands.

The project also includes a startup launcher that simplifies the first configuration by asking for the required Discord credentials, saving them into a local `.env` file and starting Lavalink through Docker.

<details>
<summary>Versión en español</summary>

**Rosy Music Bot** es un bot de música para Discord construido con **Discord.js** y **Lavalink**.

Permite reproducir música desde YouTube y YouTube Music, manejar colas de reproducción, controlar volumen, mostrar letras de canciones y utilizar comandos slash modernos de Discord.

El proyecto también incluye un launcher de inicio que simplifica la primera configuración solicitando las credenciales necesarias de Discord, guardándolas en un archivo `.env` local e iniciando Lavalink mediante Docker.

</details>

---

## Features

- Music playback from YouTube and YouTube Music.
- Slash commands for playback control.
- Queue management.
- Volume control.
- Lyrics command support.
- Lavalink integration.
- Docker-based Lavalink startup.
- Interactive first-run configuration wizard.
- Automatic public bot profile synchronization.
- Cross-platform support for Windows, Linux and macOS.
- Troubleshooting guide included.

<details>
<summary>Características en español</summary>

- Reproducción de música desde YouTube y YouTube Music.
- Comandos slash para controlar la reproducción.
- Gestión de cola de reproducción.
- Control de volumen.
- Soporte para comando de letras.
- Integración con Lavalink.
- Inicio de Lavalink mediante Docker.
- Asistente interactivo para la primera configuración.
- Sincronización automática del perfil público del bot.
- Soporte multiplataforma para Windows, Linux y macOS.
- Guía de solución de problemas incluida.

</details>

---

## Tech Stack

<div align="center">

![JavaScript](https://img.shields.io/badge/JavaScript-0F172A?style=flat-square&logo=javascript&logoColor=F7DF1E)
![Node.js](https://img.shields.io/badge/Node.js-0F172A?style=flat-square&logo=node.js&logoColor=5FA04E)
![Discord.js](https://img.shields.io/badge/Discord.js-0F172A?style=flat-square&logo=discord&logoColor=5865F2)
![Lavalink](https://img.shields.io/badge/Lavalink-0F172A?style=flat-square&logo=youtube&logoColor=FF0000)
![Docker](https://img.shields.io/badge/Docker-0F172A?style=flat-square&logo=docker&logoColor=2496ED)

</div>

---

## Preview

<div align="center">

<table>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/77e8ef2d-6d83-4bfc-b9fe-4e88d60e3519" width="320" alt="Rosy Music Bot preview 1" />
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/d1af2d31-a713-4f59-ac7d-d520615cc3cc" width="320" alt="Rosy Music Bot preview 2" />
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/2bc84fba-acfc-4ddd-9b4d-f641dc49f0bd" width="320" alt="Rosy Music Bot preview 3" />
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/3c635f38-6d99-457d-9879-48763f67db58" width="320" alt="Rosy Music Bot preview 4" />
    </td>
  </tr>
</table>

<img src="https://github.com/user-attachments/assets/d182233f-9cf9-4034-87b9-614eadd8c8a7" width="420" alt="Rosy Music Bot preview 5" />

</div>


---

## Quick Start

```bash
npm install
npm start
```

On the first run, the launcher asks for:

- Discord bot **TOKEN**
- Discord application **CLIENT_ID**
- Lavalink password, default: `rosy-local`

After the first setup, the values are saved in `.env` and reused in future executions.

<details>
<summary>Inicio rápido en español</summary>

```bash
npm install
npm start
```

En la primera ejecución, el launcher solicita:

- **TOKEN** del bot de Discord
- **CLIENT_ID** de la aplicación de Discord
- Contraseña de Lavalink, por defecto: `rosy-local`

Después de la primera configuración, los valores se guardan en `.env` y se reutilizan en futuras ejecuciones.

</details>

---

## Requirements

- [Node.js](https://nodejs.org/) 18.17.0 or higher
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A Discord application created in the [Discord Developer Portal](https://discord.com/developers/applications)

<details>
<summary>Requisitos en español</summary>

- [Node.js](https://nodejs.org/) 18.17.0 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Una aplicación creada en [Discord Developer Portal](https://discord.com/developers/applications)

</details>

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/GatuzoCXL/Rosy-Music-Bot.git
cd Rosy-Music-Bot
npm install
```

### 2. Run the bot for the first time

```bash
npm start
```

The launcher will execute the following flow:

1. **TOKEN**  
   If it is not found in `.env`, the launcher asks for the Discord bot token and saves it.

2. **CLIENT_ID**  
   Required to register slash commands.  
   You can find it in Discord Developer Portal > Your Application > General Information.

3. **LAVALINK_PASSWORD**  
   Press Enter to use the default value: `rosy-local`, or enter a custom password.

4. **Docker**  
   The launcher verifies that Docker is running and starts Lavalink automatically.

5. **Public Bot Profile**  
   The bot profile is synchronized with Discord, including description, tags and install parameters.

6. **Bot Startup**  
   The Discord bot starts after the environment is ready.

<details>
<summary>Instalación en español</summary>

### 1. Clonar el repositorio

```bash
git clone https://github.com/GatuzoCXL/Rosy-Music-Bot.git
cd Rosy-Music-Bot
npm install
```

### 2. Ejecutar el bot por primera vez

```bash
npm start
```

El launcher ejecutará el siguiente flujo:

1. **TOKEN**  
   Si no se encuentra en `.env`, el launcher solicita el token del bot de Discord y lo guarda.

2. **CLIENT_ID**  
   Es necesario para registrar los comandos slash.  
   Lo puedes encontrar en Discord Developer Portal > Tu aplicación > General Information.

3. **LAVALINK_PASSWORD**  
   Presiona Enter para usar el valor por defecto: `rosy-local`, o ingresa una contraseña personalizada.

4. **Docker**  
   El launcher verifica que Docker esté ejecutándose e inicia Lavalink automáticamente.

5. **Perfil público del bot**  
   Se sincroniza el perfil del bot con Discord, incluyendo descripción, etiquetas y parámetros de instalación.

6. **Inicio del bot**  
   El bot de Discord inicia cuando el entorno está listo.

</details>

---

## Slash Commands Deployment

Slash commands such as `/play`, `/queue`, `/pause` and others are not deployed automatically when running `npm start`.

Whenever you add or modify commands, run:

```bash
npm run deploy:commands
```

> `npm start` synchronizes the public bot profile, but it does not deploy slash commands.

<details>
<summary>Despliegue de comandos slash en español</summary>

Los comandos slash como `/play`, `/queue`, `/pause` y otros no se despliegan automáticamente al ejecutar `npm start`.

Cada vez que agregues o modifiques comandos, ejecuta:

```bash
npm run deploy:commands
```

> `npm start` sincroniza el perfil público del bot, pero no despliega comandos slash.

</details>

---

## Available Commands

| Command | Description |
|--------|-------------|
| `/play <song>` | Plays a song using a URL or search query |
| `/pause` | Pauses the current playback |
| `/resume` | Resumes playback |
| `/skip` | Skips to the next song |
| `/stop` | Stops playback and clears the queue |
| `/queue` | Shows the current playback queue |
| `/volume <1-100>` | Adjusts the playback volume |
| `/lyrics [song]` | Shows lyrics for the current song or a searched song |

<details>
<summary>Comandos disponibles en español</summary>

| Comando | Descripción |
|--------|-------------|
| `/play <canción>` | Reproduce una canción usando una URL o una búsqueda |
| `/pause` | Pausa la reproducción actual |
| `/resume` | Reanuda la reproducción |
| `/skip` | Salta a la siguiente canción |
| `/stop` | Detiene la reproducción y limpia la cola |
| `/queue` | Muestra la cola de reproducción actual |
| `/volume <1-100>` | Ajusta el volumen de reproducción |
| `/lyrics [canción]` | Muestra la letra de la canción actual o de una búsqueda |

</details>

---

## Docker Support

Rosy Music Bot uses `docker compose` to run Lavalink.

| System | Requirement |
|--------|-------------|
| Windows | Docker Desktop must be open before running `npm start` |
| Linux | Docker Desktop or Docker service must be active |
| macOS | Docker Desktop must be open before running `npm start` |

On Linux, you can start Docker with:

```bash
sudo systemctl start docker
```

If Docker is not available, the launcher offers a **manual mode** that starts the bot without Lavalink.

In manual mode, the bot can start, but music playback will not work because Lavalink is required for audio playback.

<details>
<summary>Soporte de Docker en español</summary>

Rosy Music Bot usa `docker compose` para ejecutar Lavalink.

| Sistema | Requisito |
|--------|-----------|
| Windows | Docker Desktop debe estar abierto antes de ejecutar `npm start` |
| Linux | Docker Desktop o el servicio de Docker debe estar activo |
| macOS | Docker Desktop debe estar abierto antes de ejecutar `npm start` |

En Linux, puedes iniciar Docker con:

```bash
sudo systemctl start docker
```

Si Docker no está disponible, el launcher ofrece un **modo manual** que inicia el bot sin Lavalink.

En modo manual, el bot puede iniciar, pero la reproducción de música no funcionará porque Lavalink es necesario para reproducir audio.

</details>

---

## Environment Variables

You can manually create a `.env` file in the project root:

```env
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
LAVALINK_HOST=localhost
LAVALINK_PORT=23333
LAVALINK_PASSWORD=rosy-local
```

If `.env` already exists and contains all required values, the interactive wizard will not appear.

<details>
<summary>Variables de entorno en español</summary>

Puedes crear manualmente un archivo `.env` en la raíz del proyecto:

```env
TOKEN=tu_token_de_discord
CLIENT_ID=tu_application_id
LAVALINK_HOST=localhost
LAVALINK_PORT=23333
LAVALINK_PASSWORD=rosy-local
```

Si el archivo `.env` ya existe y contiene todos los valores requeridos, el asistente interactivo no aparecerá.

</details>

---

## Public Bot Profile

The `perfil.js` file controls the public information shown in the Discord application profile.

It manages:

- `description` — text displayed under the bot name.
- `tags` — up to 5 short tags, such as `music` or `entertainment`.
- `install_params` — scopes and permissions for the "Add App" button.
- `presence_messages` — rotating status messages.

The public profile is synchronized automatically every time you run:

```bash
npm start
```

To update only the profile without starting the bot:

```bash
npm run profile:update
```

> Custom server emojis such as `<a:name:id>` may not be reliable in the Discord application description. Use Unicode emojis if you need icons in the public description.

<details>
<summary>Perfil público del bot en español</summary>

El archivo `perfil.js` controla la información pública que se muestra en el perfil de la aplicación de Discord.

Gestiona:

- `description` — texto que aparece debajo del nombre del bot.
- `tags` — hasta 5 etiquetas cortas, como `music` o `entertainment`.
- `install_params` — scopes y permisos para el botón "Añadir App".
- `presence_messages` — mensajes rotativos del estado del bot.

El perfil público se sincroniza automáticamente cada vez que ejecutas:

```bash
npm start
```

Para actualizar solo el perfil sin iniciar el bot:

```bash
npm run profile:update
```

> Los emojis personalizados de servidor como `<a:nombre:id>` pueden no ser confiables en la descripción de la aplicación de Discord. Usa emojis Unicode si necesitas iconografía en la descripción pública.

</details>

---

## Troubleshooting

### `npm start` fails with a TOKEN error

You can temporarily set the token from the terminal.

#### Windows PowerShell

```bash
$env:TOKEN="your_token"; npm start
```

#### Linux/macOS

```bash
TOKEN=your_token npm start
```

Or edit your `.env` file directly:

```env
TOKEN=your_discord_bot_token
```

---

### The bot does not play music

1. Verify that Lavalink is running:

```bash
docker ps
```

2. Check Lavalink logs:

```bash
docker compose logs lavalink
```

3. Verify that the token in `.env` is correct.

4. Restart the bot:

```bash
npm start
```

---

### Duplicate commands appear in Discord

If a command such as `/pause` appears more than once with different descriptions, you may have both **global** and **guild-scoped** commands registered.

To clear guild commands:

```bash
node scripts/clear-guild-commands.js --guild=YOUR_GUILD_ID
```

Or use the deploy script:

```bash
node scripts/deploy-commands.js --clear-guild --guild=YOUR_GUILD_ID
```

This removes guild commands without affecting global commands.

> Discord may take up to 1 hour to propagate global command changes.

---

### Docker is not responding

Check Docker status:

```bash
docker ps
```

On Linux, start Docker manually:

```bash
sudo systemctl start docker
```

Then restart the launcher:

```bash
npm start
```

---

### Port `23333` is already in use

Change the Lavalink port in `.env`:

```env
LAVALINK_PORT=23334
```

Then restart:

```bash
npm start
```

---

### Manual mode: Lavalink unavailable

If Docker is unavailable or manual mode was selected, the bot will start without Lavalink.

In this mode:

- The bot can start.
- Music commands may not work.
- Lavalink-dependent features will be unavailable.

To fix it, open Docker Desktop or start Docker and run:

```bash
npm start
```

<details>
<summary>Solución de problemas en español</summary>

### `npm start` termina con error de TOKEN

Puedes configurar temporalmente el token desde la terminal.

#### Windows PowerShell

```bash
$env:TOKEN="tu_token"; npm start
```

#### Linux/macOS

```bash
TOKEN=tu_token npm start
```

O edita directamente tu archivo `.env`:

```env
TOKEN=tu_token_de_discord
```

---

### El bot no reproduce música

1. Verifica que Lavalink esté ejecutándose:

```bash
docker ps
```

2. Revisa los logs de Lavalink:

```bash
docker compose logs lavalink
```

3. Verifica que el token en `.env` sea correcto.

4. Reinicia el bot:

```bash
npm start
```

---

### Aparecen comandos duplicados en Discord

Si un comando como `/pause` aparece más de una vez con descripciones diferentes, puede que tengas comandos **globales** y **guild-scoped** registrados con el mismo nombre.

Para limpiar comandos del guild:

```bash
node scripts/clear-guild-commands.js --guild=TU_GUILD_ID
```

O usando el script de despliegue:

```bash
node scripts/deploy-commands.js --clear-guild --guild=TU_GUILD_ID
```

Esto elimina los comandos del guild sin afectar los comandos globales.

> Discord puede tardar hasta 1 hora en propagar los cambios de comandos globales.

---

### Docker no responde

Verifica el estado de Docker:

```bash
docker ps
```

En Linux, inicia Docker manualmente:

```bash
sudo systemctl start docker
```

Luego reinicia el launcher:

```bash
npm start
```

---

### El puerto `23333` ya está en uso

Cambia el puerto de Lavalink en `.env`:

```env
LAVALINK_PORT=23334
```

Luego reinicia:

```bash
npm start
```

---

### Modo manual: Lavalink no disponible

Si Docker no está disponible o se seleccionó el modo manual, el bot iniciará sin Lavalink.

En este modo:

- El bot puede iniciar.
- Los comandos de música pueden no funcionar.
- Las funciones dependientes de Lavalink no estarán disponibles.

Para solucionarlo, abre Docker Desktop o inicia Docker y ejecuta:

```bash
npm start
```

</details>

---

## Project Structure

```bash
Rosy-Music-Bot/
├── commands/
├── events/
├── scripts/
├── perfil.js
├── docker-compose.yml
├── package.json
├── .env
└── README.md
```

> The structure may vary depending on future updates.

<details>
<summary>Estructura del proyecto en español</summary>

```bash
Rosy-Music-Bot/
├── commands/
├── events/
├── scripts/
├── perfil.js
├── docker-compose.yml
├── package.json
├── .env
└── README.md
```

> La estructura puede variar dependiendo de futuras actualizaciones.

</details>

---

## Rollback

If the bot stops working after an update, you can rollback to the previous commit:

```bash
git checkout HEAD~1
npm install
npm start
```

<details>
<summary>Rollback en español</summary>

Si el bot deja de funcionar después de una actualización, puedes regresar al commit anterior:

```bash
git checkout HEAD~1
npm install
npm start
```

</details>

---

## Roadmap

- Improve queue visualization.
- Add more playback filters.
- Improve error messages for users.
- Add playlist support.
- Improve deployment workflow.
- Add more advanced Lavalink configuration options.

<details>
<summary>Roadmap en español</summary>

- Mejorar la visualización de la cola de reproducción.
- Agregar más filtros de audio.
- Mejorar los mensajes de error para usuarios.
- Agregar soporte para playlists.
- Mejorar el flujo de despliegue.
- Agregar opciones más avanzadas de configuración para Lavalink.

</details>

---

## License

This project is licensed under the **MIT License**.

---

## Author

Developed by **GatuzoCXL**.

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-GatuzoCXL-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/GatuzoCXL)

</div>
