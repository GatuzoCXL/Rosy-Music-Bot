const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { getQueue, setRepeatMode, normalizeRepeatMode } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');
const { createSuccessEmbed, createErrorEmbed, createNoMusicEmbed, createLavalinkUnavailableEmbed } = require('../../utils/embeds');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

// Cycle repeat mode: off -> track -> queue -> off
function cycleRepeatMode(currentMode) {
    const mode = normalizeRepeatMode(currentMode);
    if (mode === 'off') return 'track';
    if (mode === 'track') return 'queue';
    return 'off';
}

function repeatModeLabel(mode) {
    const m = normalizeRepeatMode(mode);
    if (m === 'track') return '🔂 Canción';
    if (m === 'queue') return '🔁 Cola';
    return '❌ Desactivado';
}

module.exports = {
    name: 'loop',
    description: 'Cambia el modo de repetición',
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Cambia el modo de repetición')
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('modo')
                .setDescription('Modo de repetición')
                .setRequired(false)
                .addChoices(
                    { name: 'off', value: 'off' },
                    { name: 'track', value: 'track' },
                    { name: 'queue', value: 'queue' }
                )
        ),
    async execute(message, args, client) {
        const ctx = createMessageCommandContext(message, args);
        return this.executeContext(ctx, client);
    },
    async executeContext(ctx, client) {
        const guildId = ctx.guild.id;

        if (!isLavalinkAvailable(client)) {
            return ctx.reply({ embeds: [createLavalinkUnavailableEmbed()] });
        }

        const llQueue = await getQueue(client.lavalinkManager, guildId);
        if (!llQueue) {
            return ctx.reply({ embeds: [createNoMusicEmbed('No hay nada reproduciéndose.')] });
        }

        try {
            const modeArg = ctx.options.getString('modo');

            let newMode;
            if (modeArg) {
                newMode = normalizeRepeatMode(modeArg);
            } else {
                // Cycle
                newMode = cycleRepeatMode(llQueue.repeatMode);
            }

            await setRepeatMode(client.lavalinkManager, guildId, newMode);
            const modeState = newMode === 'off' ? 'desactivado' : 'activado';
            Logger.music(`🔁 Loop cambiado a "${newMode}" por ${ctx.user.tag}`, 'loop.js');
            return ctx.reply({ embeds: [createSuccessEmbed('🔁 Repetir', `${repeatModeLabel(newMode)} — modo de repetición ${modeState}.`)] });
        } catch (error) {
            if (error.message?.includes('no disponible')) {
                return ctx.reply({ embeds: [createErrorEmbed('Función no disponible', 'La función de repetición no está disponible en este nodo Lavalink.')] });
            }
            Logger.error('Error en loop', error, 'loop.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al cambiar modo', 'No se pudo cambiar el modo de repetición.')] });
        }
    }
};