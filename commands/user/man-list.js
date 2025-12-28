const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const UserConfig = require('../../models/UserConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'man-list',
    description: 'View your current managers.',
    aliases: ['manager-list', 'man list', 'ml'],
    category: "user",
    async execute(message, args, client) {
        const theme = await themeManager.getTheme(message.guild.id);

        const userConfig = await UserConfig.findOne({ userId: message.author.id });
        if (!userConfig || userConfig.managers.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.no}・You have no managers.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        const managersList = userConfig.managers.map(id => `<@${id}>`).join(', ');
        const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***## Your Managers:***\n***${managersList}***`)
            );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
    },
};