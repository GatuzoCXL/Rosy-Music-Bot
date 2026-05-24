'use strict';

// Syncs app profile, prepares Lavalink, and launches the bot with guided local setup.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { checkDockerState, startDockerDesktop, openBrowser, MAX_RETRY } = require('./utils/docker-check');
const { syncApplicationProfile } = require('./utils/applicationProfile');
const ENV_FILE = path.join(__dirname, '.env');
const LAVALINK_SERVICE = 'lavalink';
const HEALTH_INTERVAL_MS = 2000;
const HEALTH_TIMEOUT_MS = 30000;
const DISCORD_HOST = 'discord.com';
const DOCKER_INSTALL_URL = 'https://www.docker.com/products/docker-desktop/';
const DEFAULT_LAVALINK_PORT = '23333';

const dim = '\x1b[2m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const green = '\x1b[32m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

function log(msg, color = reset) {
    console.log(`${color}${msg}${reset}`);
}

function logSection(label) {
    console.log(`\n${dim}── ${label} ──────────────────────────────────${reset}`);
}

function parseEnvFile(filepath) {
  const env = {};
  if (!fs.existsSync(filepath)) return env;
  const content = fs.readFileSync(filepath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

function persistEnvKey(key, value) {
  const lines = [];
  let found = false;

  if (fs.existsSync(ENV_FILE)) {
    const existing = fs.readFileSync(ENV_FILE, 'utf8');
    for (const line of existing.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        lines.push(line);
        continue;
      }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) {
        lines.push(line);
        continue;
      }
      const k = trimmed.slice(0, eqIdx).trim();
      if (k === key) {
        if (!found) {
          lines.push(`${key}=${value}`);
          found = true;
        }
      } else {
        lines.push(line);
      }
    }
  }

  if (!found) {
    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');

  try {
    fs.chmodSync(ENV_FILE, parseInt('0600', 8));
  } catch {
  }
}

function getLavalinkPort() {
  if (process.env.LAVALINK_PORT) return process.env.LAVALINK_PORT;
  const envFile = parseEnvFile(ENV_FILE);
  if (envFile.LAVALINK_PORT) return envFile.LAVALINK_PORT;
  return DEFAULT_LAVALINK_PORT;
}

function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

function checkLavalinkReady(port) {
  const http = require('http');
  const healthUrl = `http://localhost:${port}/`;

  return new Promise((resolve) => {
    const req = http.get(healthUrl, (res) => {
      res.resume();
      resolve(res.statusCode === 401 || res.statusCode === 403);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function promptNewPort(currentPort) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`Ingresa otro puerto para Lavalink (actual: ${currentPort}): `, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      const port = parseInt(trimmed, 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        resolve(String(port));
      } else {
        resolve(null);
      }
    });
  });
}

function getToken() {
  const envToken = process.env.TOKEN;
  if (envToken) return envToken;
  const envFile = parseEnvFile(ENV_FILE);
  if (envFile.TOKEN) return envFile.TOKEN;
  return null;
}

function getClientId() {
  if (process.env.CLIENT_ID) return process.env.CLIENT_ID;
  if (process.env.DISCORD_CLIENT_ID) return process.env.DISCORD_CLIENT_ID;
  const envFile = parseEnvFile(ENV_FILE);
  if (envFile.CLIENT_ID) return envFile.CLIENT_ID;
  if (envFile.DISCORD_CLIENT_ID) return envFile.DISCORD_CLIENT_ID;
  return null;
}

function isTTY() {
  return process.stdin.isTTY === true;
}

async function promptTokenInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Ingresa tu TOKEN de Discord Bot: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function ensureToken() {
  const existing = getToken();
  if (existing) {
    log(`  ${green}✓${reset} TOKEN encontrado en ${dim}.env${reset}`, green);
    if (!parseEnvFile(ENV_FILE).TOKEN) {
      persistEnvKey('TOKEN', existing);
    }
    return existing;
  }

  if (!isTTY()) {
    log(`\n${red}[ERROR] TOKEN must be set as environment variable in non-TTY environments.${reset}`, red);
      log(`${dim}   Ejecuta: set TOKEN=tu_token && npm start${reset}`);
    log(`${dim}   O en PowerShell: $env:TOKEN=\"tu_token\"; npm start${reset}\n`);
    process.exit(1);
  }

  log(`\n${yellow}[INFO] No se encontró TOKEN en .env ni en variable de entorno.${reset}`, yellow);
  logSection('TOKEN de Discord Bot');

  let token;
  try {
    token = await promptTokenInteractive();
  } catch (err) {
    log(`\n${red}[ERROR] No se pudo leer el TOKEN desde la entrada estándar.${reset}`, red);
    process.exit(1);
  }

  if (!token) {
    log(`\n${red}[ERROR] TOKEN vacío. Abortando.${reset}`, red);
    process.exit(1);
  }

  persistEnvKey('TOKEN', token);
  log(`  ${green}✓${reset} TOKEN guardado en ${dim}.env${reset}`, green);

  return token;
}

async function promptClientIdInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Ingresa tu CLIENT_ID de Discord (Application ID): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function ensureClientId() {
  const existing = getClientId();
  if (existing) {
    log(`  ${green}✓${reset} CLIENT_ID encontrado en ${dim}.env${reset}`, green);
    return existing;
  }

  if (!isTTY()) {
    log(`\n${red}[ERROR] CLIENT_ID must be set as environment variable in non-TTY environments.${reset}`, red);
      log(`${dim}   Ejecuta: set CLIENT_ID=tu_id && npm start${reset}`);
    log(`${dim}   O en PowerShell: $env:CLIENT_ID=\"tu_id\"; npm start${reset}\n`);
    process.exit(1);
  }

  log(`\n${yellow}[INFO] No se encontró CLIENT_ID en .env ni en variable de entorno.${reset}`, yellow);
  logSection('CLIENT_ID de Discord');

  let clientId;
  try {
    clientId = await promptClientIdInteractive();
  } catch (err) {
    log(`\n${red}[ERROR] No se pudo leer el CLIENT_ID desde la entrada estándar.${reset}`, red);
    process.exit(1);
  }

  if (!clientId) {
    log(`\n${red}[ERROR] CLIENT_ID vacío. Abortando.${reset}`, red);
    process.exit(1);
  }

  persistEnvKey('CLIENT_ID', clientId);
  log(`  ${green}✓${reset} CLIENT_ID guardado en ${dim}.env${reset}`, green);

  return clientId;
}

const RECOMMENDED_PASSWORD = 'rosy-local';

async function promptPasswordInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    log(`\n${yellow}[INFO]${reset} Configuración de ${dim}LAVALINK_PASSWORD${reset}`);
    log(`  ${dim}1)${reset} Usar contraseña recomendada ${dim}(${RECOMMENDED_PASSWORD})${reset} — presiona Enter`);
    log(`  ${dim}2)${reset} Ingresar contraseña personalizada`);
      rl.question(`\n  Elige opción (1/2) o ingresa tu contraseña: `, (answer) => {
      const trimmed = answer.trim();
      if (trimmed === '1' || trimmed === '') {
        rl.close();
        resolve(RECOMMENDED_PASSWORD);
      } else if (trimmed === '2') {
        rl.question('  Ingresa tu contraseña personalizada: ', (pw) => {
          rl.close();
          resolve(pw.trim() || RECOMMENDED_PASSWORD);
        });
      } else {
        rl.close();
        resolve(trimmed);
      }
    });
  });
}

async function ensureLavalinkPassword() {
  const envVar = process.env.LAVALINK_PASSWORD;
  const envFile = parseEnvFile(ENV_FILE);

  if (envFile.LAVALINK_PASSWORD) {
    log(`  ${green}✓${reset} LAVALINK_PASSWORD encontrado en ${dim}.env${reset}`, green);
    return envFile.LAVALINK_PASSWORD;
  }

  if (envVar) {
    persistEnvKey('LAVALINK_PASSWORD', envVar);
    log(`  ${green}✓${reset} LAVALINK_PASSWORD persistido desde variable de entorno`, green);
    return envVar;
  }

  if (isTTY()) {
    const chosen = await promptPasswordInteractive();
    persistEnvKey('LAVALINK_PASSWORD', chosen);
    log(`  ${green}✓${reset} LAVALINK_PASSWORD configurado`, green);
    return chosen;
  }

  persistEnvKey('LAVALINK_PASSWORD', RECOMMENDED_PASSWORD);
  log(`  ${green}✓${reset} LAVALINK_PASSWORD configurado como ${dim}${RECOMMENDED_PASSWORD}${reset} (no interactivo)`, green);
  return RECOMMENDED_PASSWORD;
}

const DOCKER_POLL_INTERVAL_MS = 3000;
const DOCKER_POLL_TIMEOUT_MS = 60000;

async function pollDockerUntilAvailable(onPoll) {
  const deadline = Date.now() + DOCKER_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = await checkDockerState();
    if (state === 'available') return 'available';
    if (onPoll) onPoll(state);
    await new Promise((r) => setTimeout(r, DOCKER_POLL_INTERVAL_MS));
  }
  return 'timeout';
}

async function waitDockerManually() {
  console.log('');
  console.log('Abre Docker Desktop (o inicia el servicio de Docker manualmente) ahora.');
  console.log(`${dim}Esperando a que el daemon de Docker esté activo...${reset}`);

  return pollDockerUntilAvailable((state) => {
    if (state === 'daemon_stopped') {
      console.log(`  ${dim}[INFO] Docker daemon aún no disponible — esperando...${reset}`);
    }
  });
}

async function openDockerDesktopWithPolling() {
  const launched = startDockerDesktop();
  if (!launched) {
    console.log('');
    console.log('No se pudo abrir Docker Desktop automáticamente.');
    console.log('Por favor, ábrelo manualmente y luego presiona s para reintentar.');
    return false;
  }

  console.log('');
  console.log('Abriendo Docker Desktop — esto puede tardar entre 20 y 60 segundos.');
  console.log(`${dim}Esperando a que el daemon de Docker esté activo...${reset}`);

  const result = await pollDockerUntilAvailable((state) => {
    if (state === 'daemon_stopped') {
      console.log(`  ${dim}[INFO] Docker daemon aún no disponible — esperando...${reset}`);
    }
  });

  if (result === 'available') return true;

  console.log('');
  console.log('Docker Desktop no respondió a tiempo.');
  console.log('Por favor, abre Docker Desktop manualmente y luego presiona s para reintentar la verificación.');
  return false;
}

async function promptDockerResolution(state) {
  let attempts = 0;

  while (attempts < MAX_RETRY) {
    console.log('');

    if (state === 'missing') {
      log(`${red}[ERROR] Docker no está disponible.${reset}`, red);
      console.log('');
      console.log('Para usar Rosy Music Bot necesitas Docker Desktop.');
      console.log(`Descargalo gratis desde: ${DOCKER_INSTALL_URL}`);
      console.log('');
    } else if (state === 'daemon_stopped') {
      log(`${yellow}[WARN] Docker instalado pero no está corriendo.${reset}`, yellow);
      console.log('');
      console.log('El daemon de Docker no está activo. ¿Quieres que abra Docker Desktop?');
      console.log(`${dim}(una vez abierto, el daemon de Docker se inicia automáticamente)${reset}`);
      console.log('');
    }

    const question = state === 'missing'
      ? '¿Ya instalaste Docker? Reiniciar verificación (s/n): '
      : '¿Quieres abrir Docker Desktop ahora? (s/n): ';

    const answer = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(question, (a) => {
        rl.close();
        resolve(a.trim().toLowerCase());
      });
    });

    if (answer === 'n') {
      console.log('');
      log(`${yellow}[AVISO] La reproducción de música local requiere Lavalink, y Lavalink requiere Docker.${reset}`, yellow);
      console.log('Si continúas sin Docker, los comandos de música pueden no funcionar o tener funcionalidad limitada.');
      console.log('');

      if (process.platform === 'linux') {
        console.log('En Linux, Docker Desktop puede no abrirse automáticamente.');
        console.log('Puedes iniciar el servicio de Docker manualmente con:');
        console.log(`${dim}  sudo systemctl start docker${reset}`);
        console.log('o abrir Docker Desktop manualmente y luego elegir la opción de reintentar.');
        console.log('');
      }

      console.log('¿Qué deseas hacer?');
      console.log(`  ${dim}s${reset} = abrir/iniciar Docker ahora y volver a verificar`);
      console.log(`  ${dim}w${reset} = esperar/revisar Docker — abre Docker manualmente y espera a que esté listo`);
      console.log(`  ${dim}m${reset} = modo manual sin Lavalink para esta sesión`);
      console.log(`  ${dim}c${reset} = cancelar/salir`);
      console.log('');

      const secondAnswer = await new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        rl.question('Elige (s/w/m/c): ', (a) => {
          rl.close();
          resolve(a.trim().toLowerCase());
        });
      });

      if (secondAnswer === 's') {
        attempts++;
        if (state === 'missing') {
          openBrowser(DOCKER_INSTALL_URL);
        } else if (state === 'daemon_stopped') {
          const ok = await openDockerDesktopWithPolling();
          if (ok) return true;
          state = await checkDockerState();
          continue;
        }
        const newState = await checkDockerState();
        if (newState === 'available') {
          return true;
        }
        state = newState;
      } else if (secondAnswer === 'w') {
        attempts++;
        const result = await waitDockerManually();
        if (result === 'available') return true;
        state = await checkDockerState();
      } else if (secondAnswer === 'm') {
        console.log('');
        console.log(`${yellow}[AVISO] Modo manual deshabilita Lavalink para esta sesión.${reset}`);
        console.log('Si abres Docker después, reinicia con npm start para activar música.');
        console.log('');
        return false;
      } else {
        console.log('');
        console.log('Saliendo. Cuando estés listo, ejecuta npm start nuevamente.');
        console.log(`${dim}https://www.docker.com/products/docker-desktop/${reset}\n`);
        process.exit(0);
      }
    }

    if (answer === 's') {
      attempts++;
      if (state === 'missing') {
        openBrowser(DOCKER_INSTALL_URL);
      } else if (state === 'daemon_stopped') {
        const ok = await openDockerDesktopWithPolling();
        if (ok) return true;
        state = await checkDockerState();
        continue;
      }

      const newState = await checkDockerState();
      if (newState === 'available') {
        return true;
      }
      state = newState;
    }
  }

  log(`\n${red}[ERROR] Se excedió el número de intentos (${MAX_RETRY}). Saliendo.${reset}`, red);
  process.exit(1);
  return false;
}

class DockerComposeError extends Error {
  constructor(message, stderr) {
    super(message);
    this.name = 'DockerComposeError';
    this.stderr = stderr || '';
  }
}

function dockerComposeUp() {
  return new Promise((resolve, reject) => {
    logSection('Iniciando Lavalink');
    log(`  ${dim}docker compose up -d ${LAVALINK_SERVICE}${reset}`);

    let stderr = '';
    const proc = spawn(
      'docker',
      ['compose', 'up', '-d', LAVALINK_SERVICE],
      { shell: false, windowsHide: true, stdio: 'pipe' }
    );

    proc.stdout.on('data', (d) => { process.stdout.write(d); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stderr);
      } else {
        reject(new DockerComposeError(`exit code ${code}`, stderr));
      }
    });

    proc.on('error', (err) => reject(new DockerComposeError(err.message, stderr)));
  });
}

async function waitForLavalinkHealth(port) {
  const https = require('https');
  const http = require('http');

  return new Promise((resolve, reject) => {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;
    const healthUrl = `http://localhost:${port}/`;

    function attempt() {
      if (Date.now() > deadline) {
        reject(new Error('TIMEOUT'));
        return;
      }

      log(`  ${dim}Esperando Lavalink...${reset}`);

      const req = http.get(healthUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 401 || res.statusCode === 403) {
            log(`  ${green}✓${reset} Lavalink listo`, green);
            resolve();
            return;
          }

          try {
            const json = JSON.parse(data);
            if (json.status === 'UP') {
              log(`  ${green}✓${reset} Lavalink listo`, green);
              resolve();
            } else {
              log(`  ${dim}Estado: ${json.status} — reintentando...${reset}`);
              setTimeout(attempt, HEALTH_INTERVAL_MS);
            }
          } catch {
            setTimeout(attempt, HEALTH_INTERVAL_MS);
          }
        });
      });

      req.on('error', () => {
        setTimeout(attempt, HEALTH_INTERVAL_MS);
      });

      req.setTimeout(3000, () => {
        req.destroy();
        setTimeout(attempt, HEALTH_INTERVAL_MS);
      });
    }

    attempt();
  });
}

function spawnBot() {
  logSection('Iniciando bot');
  log(`  ${dim}node .${reset}\n`);

  const bot = spawn('node', ['.'], {
    shell: false,
    windowsHide: false,
    stdio: 'inherit',
    env: { ...process.env },
  });

  bot.on('close', (code) => {
    log(`\n${dim}Bot finalizado con código ${code}${reset}`);
    process.exit(code);
  });

  bot.on('error', (err) => {
    log(`\n${red}[ERROR] No se pudo iniciar el bot: ${err.message}${reset}`, red);
    process.exit(1);
  });
}

function startInManualMode() {
  logSection('Modo manual');
  log(`${yellow}[INFO] Iniciando bot sin Lavalink — algunas funciones pueden estar limitadas.${reset}`, yellow);
  console.log(`${dim}Modo manual deshabilita Lavalink para esta sesión.${reset}`);
  console.log(`${dim}Si abres Docker después, reinicia con npm start para activar música.${reset}`);
  log(`  ${dim}node .${reset}\n`);

  const bot = spawn('node', ['.'], {
    shell: false,
    windowsHide: false,
    stdio: 'inherit',
    env: { ...process.env, DISABLE_LAVALINK: 'true' },
  });

  bot.on('close', (code) => {
    log(`\n${dim}Bot finalizado con código ${code}${reset}`);
    process.exit(code);
  });

  bot.on('error', (err) => {
    log(`\n${red}[ERROR] No se pudo iniciar el bot: ${err.message}${reset}`, red);
    process.exit(1);
  });
}

async function main() {
  console.log(`\n${bold}${cyan}Rosy Music Bot — Launcher${reset}`);
  console.log(`${dim}v4 + Lavalink (Interactive Config)${reset}`);

  logSection('Verificando TOKEN');
  await ensureToken();

  logSection('Verificando CLIENT_ID');
  await ensureClientId();

  logSection('Sincronizando perfil de aplicación');
  const token = getToken();
  const syncResult = await syncApplicationProfile(token, { verbose: true });
  if (syncResult.ok) {
    if (syncResult.changed) {
      log(`  ${green}✓${reset} Perfil actualizado — cambios pueden tardar unos minutos en Discord`, green);
    } else {
      log(`  ${dim}✓${reset} Perfil ya estaba actualizado`, reset);
    }
  } else if (syncResult.status === 401 || syncResult.status === 403) {
    log(`  ${red}✗${reset} Error de autenticación — verifica el TOKEN (HTTP ${syncResult.status})`, red);
    log(`${dim}   El perfil no se sincronizó — el bot igualmente intentará iniciar.${reset}`);
  } else {
    log(`${yellow}⚠${reset} No se pudo sincronizar perfil: ${syncResult.message} — continuando de todas formas`, yellow);
  }

  logSection('Verificando LAVALINK_PASSWORD');
  await ensureLavalinkPassword();

  logSection('Verificando Docker');
  const dockerState = await checkDockerState();

  if (dockerState === 'available') {
    log(`  ${green}✓${reset} Docker Compose disponible`, green);
  } else {
    if (!isTTY()) {
      log(`\n${red}[ERROR] Docker Desktop no está disponible.${reset}`, red);
      log(`${dim}   Asegúrate de tener Docker Desktop abierto y funcionando.${reset}`);
      log(`${dim}   https://www.docker.com/products/docker-desktop/${reset}\n`);
      process.exit(1);
    }

    const userConfirmedDocker = await promptDockerResolution(dockerState);

    if (!userConfirmedDocker) {
      startInManualMode();
      return;
    }

    log(`  ${green}✓${reset} Docker Compose disponible`, green);
  }

  logSection('Iniciando Lavalink');
    const lavalinkPort = getLavalinkPort();
    let lavalinkAlreadyRunning = false;
    const portBefore = await checkPortAvailable(lavalinkPort);
    if (!portBefore) {
      lavalinkAlreadyRunning = await checkLavalinkReady(lavalinkPort);
    }

    if (!portBefore && lavalinkAlreadyRunning) {
      log(`  ${green}✓${reset} Lavalink ya está respondiendo en el puerto ${lavalinkPort}`, green);
    } else if (!portBefore) {
      log(`\n${yellow}[WARN] El puerto ${lavalinkPort} ya está en uso.${reset}`, yellow);
      console.log('El puerto seleccionado está ocupado por otro proceso.');
      console.log('La opción más segura es elegir otro puerto.');
      console.log(`${dim}(cerrar ese proceso puede afectar otras aplicaciones — solo hazlo si sabes lo que haces)${reset}`);
      console.log('');

      if (isTTY()) {
        const newPort = await promptNewPort(lavalinkPort);
        if (newPort) {
          persistEnvKey('LAVALINK_PORT', newPort);
          log(`  ${green}✓${reset} LAVALINK_PORT guardado en ${dim}.env${reset}`, green);
          log(`${dim}   Reinicia el launcher para usar el nuevo puerto.${reset}\n`);
          process.exit(0);
          return;
        }
      }

      log(`\n${red}[ERROR] No se puede iniciar Lavalink en el puerto ${lavalinkPort}.${reset}`, red);
      log(`${dim}   Elige otro puerto configurando LAVALINK_PORT en ${dim}.env${reset}\n`);
      process.exit(1);
    }

    let composeStderr = '';
    try {
      if (!lavalinkAlreadyRunning) {
        composeStderr = await dockerComposeUp();
      }
    } catch (err) {
    composeStderr = err.stderr || '';
    log(`\n${red}[ERROR] No se pudo iniciar Lavalink: ${err.message}${reset}`, red);
    if (composeStderr) {
      log(`${dim}--- docker compose output ---${reset}`);
      console.log(composeStderr.slice(0, 500));
      log(`${dim}----------------------------${reset}`);
    }

    const daemonPattern = /npipe|pipe\/docker|conectar al daemon|daemon not running/i;
    const portPattern = /bind.*port|puerto.*ocupado|port.*in use/i;
    const isDaemonIssue = daemonPattern.test(composeStderr);
    const isPortConflict = portPattern.test(composeStderr);

    if (isDaemonIssue) {
      console.log('');
      console.log('Docker Desktop no está respondiendo.');
      console.log('Por favor, abre Docker Desktop y espera a que el daemon esté activo.');

      if (isTTY()) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise((resolve) => {
          rl.question('¿Quieres abrir Docker Desktop y reintentar? (s/n): ', (a) => {
            rl.close();
            resolve(a.trim().toLowerCase());
          });
        });
        if (answer === 's') {
          const ok = await openDockerDesktopWithPolling();
          if (ok) {
            try {
              await dockerComposeUp();
            } catch (retryErr) {
              log(`\n${red}[ERROR] Sigue sin funcionar: ${retryErr.message}${reset}`, red);
              process.exit(1);
            }
          } else {
            console.log('');
            console.log('Abre Docker Desktop manualmente y luego ejecuta npm start para reintentarlo.');
            console.log(`${dim}   https://www.docker.com/products/docker-desktop/${reset}\n`);
            process.exit(1);
          }
        } else {
          process.exit(1);
        }
      } else {
        process.exit(1);
      }
    } else if (isPortConflict) {
      console.log('');
      console.log(`El puerto ${lavalinkPort} está ocupado.`);
      console.log('La opción más segura es elegir otro puerto.');
      console.log(`${dim}(cerrar ese proceso puede afectar otras aplicaciones)${reset}`);
      console.log(`${dim}   Configura LAVALINK_PORT en .env y reinicia.${reset}\n`);
      process.exit(1);
    } else {
      log(`${dim}   Ejecuta: docker compose logs lavalink${reset}\n`);
      process.exit(1);
    }
  }

  try {
      await waitForLavalinkHealth(lavalinkPort);
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        log(`\n${red}[ERROR] Lavalink no respondió en ${HEALTH_TIMEOUT_MS / 1000}s.${reset}`, red);
        log(`${dim}   Ejecuta: docker compose logs lavalink${reset}`);
        log(`${dim}   Verifica que Docker Desktop este corriendo.${reset}\n`);
      } else {
        log(`\n${red}[ERROR] Error esperando Lavalink: ${err.message}${reset}`, red);
      }
      process.exit(1);
    }

    spawnBot();
}

main().catch((err) => {
  log(`\n${red}[ERROR] Fallo inesperado: ${err.message}${reset}`, red);
  process.exit(1);
});
