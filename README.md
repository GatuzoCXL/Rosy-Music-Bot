# 🎵 Rosy Music Bot

Un bot de música para Discord potente y fácil de usar, construido con Discord.js y Distube.

## ✨ Características

- 🎵 Reproducción de música desde YouTube y Spotify
- 📋 Sistema de cola de reproducción
- 🎚️ Control de volumen
- ⏯️ Controles básicos (play, pause, resume, skip, stop)
- 🔍 Búsqueda de canciones por nombre
- 💻 Fácil de configurar y usar

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 18.17.0 o superior)
- [npm](https://www.npmjs.com/) (normalmente viene con Node.js)
- Una [aplicación de Discord](https://discord.com/developers/applications) y su token de bot
- [FFmpeg](https://ffmpeg.org/) (incluido en las dependencias, pero si hay problemas puedes instalarlo manualmente)

### Instalación Manual de FFmpeg (Opcional)

Si tienes problemas con FFmpeg, puedes instalarlo manualmente:

#### Windows (usando Chocolatey)
1. Instala [Chocolatey](https://chocolatey.org/install) si no lo tienes
2. Abre PowerShell como administrador y ejecuta:
```powershell
choco install ffmpeg
```

#### Linux
```bash
sudo apt update
sudo apt install ffmpeg
```

#### macOS
```bash
brew install ffmpeg
```

## 🚀 Instalación

1. Clona este repositorio:
```bash
git clone [URL-del-repositorio]
cd RosyMusicBot_estable
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto con la siguiente información:
```env
TOKEN=tu_token_de_discord_aquí
YOUTUBE_API_KEY=tu_clave_api_de_youtube
SPOTIFY_CLIENT_ID=tu_client_id_de_spotify
SPOTIFY_CLIENT_SECRET=tu_client_secret_de_spotify
```

4. Inicia el bot:
```bash
npm start
```

## 📝 Configuración

### Obtener las Claves Necesarias

1. **Token de Discord:**
   - Ve a [Discord Developer Portal](https://discord.com/developers/applications)
   - Crea una nueva aplicación o selecciona una existente
   - Ve a la sección "Bot" y copia el token

2. **YouTube API Key:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un nuevo proyecto o selecciona uno existente
   - Habilita la API de YouTube Data API v3
   - Crea una credencial y copia la API Key

3. **Spotify API:**
   - Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Crea una nueva aplicación
   - Copia el Client ID y Client Secret

## 🎮 Comandos

| Comando | Descripción |
|---------|-------------|
| `r!play <canción>` | Reproduce una canción (URL o nombre) |
| `r!pause` | Pausa la reproducción actual |
| `r!resume` | Reanuda la reproducción |
| `r!skip` | Salta a la siguiente canción |
| `r!stop` | Detiene la reproducción y limpia la cola |
| `r!queue` | Muestra la cola de reproducción |
| `r!volume <1-100>` | Ajusta el volumen |
| `r!help` | Muestra la lista de comandos |

## 🔧 Solución de Problemas Comunes

### El bot no reproduce música
- Asegúrate de tener todas las dependencias instaladas
- Verifica que las claves API en el archivo `.env` sean correctas
- Comprueba que el bot tenga los permisos necesarios en el servidor

### Errores de FFmpeg
- Primero, intenta con la dependencia `ffmpeg-static` que viene incluida
- Si hay problemas, instala FFmpeg manualmente usando Chocolatey (Windows), apt (Linux) o brew (macOS)
- Para verificar si FFmpeg está instalado correctamente, abre una terminal y ejecuta:
  ```bash
  ffmpeg -version
  ```
- Si el comando no es reconocido en Windows después de instalar con Chocolatey, reinicia tu terminal o computadora

### El bot no responde a los comandos
- Verifica que el prefijo sea `r!`
- Asegúrate de que el bot tenga los permisos necesarios
- Comprueba que el token del bot sea correcto

## 🚀 Próximas Mejoras

¡El bot está en constante evolución! Estas son algunas de las características que se implementarán en futuras versiones:

- 🎮 Interfaz interactiva con botones y menús desplegables
- 📊 Sistema de cola mejorado con paginación
- 🎵 Soporte para más plataformas de música
- 🎨 Diseño visual mejorado en embeds
- ⚡ Optimización de rendimiento
- 🔍 Búsqueda avanzada de canciones
- 🎚️ Controles de audio mejorados

## 📜 Licencia

Este proyecto está bajo la Licencia ISC. Siéntete libre de usarlo y modificarlo.

## 🤝 Contribuir

Las contribuciones son bienvenidas! Si encuentras un bug o tienes una sugerencia, por favor abre un issue o un pull request.

## ⭐ Créditos

Desarrollado con ❤️ por GatuzoCXL

---
**Nota:** Asegúrate de no compartir tus tokens y claves API. Mantenlos seguros en el archivo `.env`.
