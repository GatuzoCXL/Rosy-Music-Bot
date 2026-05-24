'use strict';

require('dotenv').config();

const { syncApplicationProfile, buildProfilePayload } = require('../utils/applicationProfile');

const token = process.env.TOKEN;
if (!token) {
  console.error('❌ Falta TOKEN en las variables de entorno.');
  process.exit(1);
}

const payload = buildProfilePayload();

console.log('🔧 Actualizando perfil de aplicación Discord...');
console.log(`   description : ${payload.description}`);
console.log(`   tags        : [${payload.tags.join(', ')}]`);
console.log(`   scopes      : [${payload.install_params.scopes.join(', ')}]`);
console.log(`   permissions : ${payload.install_params.permissions}`);
console.log();

syncApplicationProfile(token, { verbose: true }).then((result) => {
  if (result.ok) {
    if (result.changed) {
      console.log('✅ Perfil actualizado correctamente.');
      console.log('   Los cambios pueden tardar unos minutos en reflejarse en Discord.');
    } else {
      console.log('ℹ️  Perfil ya está actualizado — sin cambios necesarios.');
    }
    process.exit(0);
  } else if (result.status === 401 || result.status === 403) {
    console.error('❌ Error de autenticación — verifica que TOKEN sea un token de bot válido con permisos de aplicación.');
    console.error(`   HTTP ${result.status}`);
    process.exit(1);
  } else {
    console.error(`❌ Error actualizando perfil: ${result.message}`);
    process.exit(1);
  }
}).catch((err) => {
  console.error('❌ Error de conexión:', err.message);
  process.exit(1);
});