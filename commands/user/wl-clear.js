const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const UserConfig = require('../../models/UserConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'wl-clear',
    description: 'Clear your whitelist.',
    aliases: ['whitelist-clear'],
    category: "user",
    async execute(message, args, client) {
        const theme = await themeManager.getTheme(message.guild.id);

        let userConfig = await UserConfig.findOne({ userId: message.author.id });

        if (!userConfig || userConfig.whitelist.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.info}・Your whitelist is already empty.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        userConfig.whitelist = []; 
        await userConfig.save();

        const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${theme.emojis.yes}・Your whitelist has been cleared.***`)
            );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
    },
};