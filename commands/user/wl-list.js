const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const UserConfig = require('../../models/UserConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'wl-list',
    description: 'View your personal whitelist.',
    aliases: ['whitelist-list'],
    category: "user",
    async execute(message, args, client) {
        const theme = await themeManager.getTheme(message.guild.id);

        const userConfig = await UserConfig.findOne({ userId: message.author.id });
        if (!userConfig || userConfig.whitelist.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.no}・No users are whitelisted.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        const whitelistedUsers = userConfig.whitelist.map(id => `<@${id}>`).join(', ');
        const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***## Your Whitelist:**\n***${whitelistedUsers}***`)
            );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
    },
};