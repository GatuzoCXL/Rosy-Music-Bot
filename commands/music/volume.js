const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { getQueue, setVolume } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');
const { createSuccessEmbed, createErrorEmbed, createWarningEmbed, createInfoEmbed, createNoMusicEmbed, createLavalinkUnavailableEmbed } = require('../../utils/embeds');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'volume',
    description: 'Ajusta el volumen de la música (0-100)',
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ajusta el volumen de la música (0-100)')
        .setDMPermission(false)
        .addIntegerOption(option =>
            option
                .setName('volumen')
                .setDescription('Volumen (0-100)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(100)
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

        const currentVol = llQueue.volume;
        const targetVol = ctx.options.getInteger('volumen');

        if (targetVol === null) {
            return ctx.reply({ embeds: [createInfoEmbed('🔊 Volumen', `Volumen actual: **${currentVol}%**`)] });
        }

        if (targetVol < 0 || targetVol > 100) {
            return ctx.reply({ embeds: [createWarningEmbed('Valor inválido', 'Especifica un volumen entre 0 y 100.')] });
        }

        try {
            await setVolume(client.lavalinkManager, guildId, targetVol);
            Logger.music(`🔊 Volumen: ${targetVol}% por ${ctx.user.tag}`, 'volume.js');
            return ctx.reply({ embeds: [createSuccessEmbed('🔊 Volumen', `Volumen ajustado a **${targetVol}%**.`)] });
        } catch (error) {
            Logger.error('Error en volume (Lavalink)', error, 'volume.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al ajustar volumen', 'No se pudo ajustar el volumen.')] });
        }
    }
};