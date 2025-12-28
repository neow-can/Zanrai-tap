const { ContainerBuilder, TextDisplayBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const UserConfig = require('../../models/UserConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'wl-remove',
    description: 'Remove a user from the whitelist.',
    aliases: ['whitelist-remove'],
    category: "user",
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await themeManager.getTheme(guildId);


        const userInput = args[0]; 
        if (!userInput) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.info}・Please provide a user.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        const targetUser = message.mentions.users.first() || await client.users.fetch(userInput).catch(() => null);
        if (!targetUser) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.no}・Invalid user. Please provide a valid user.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        let userConfig = await UserConfig.findOne({ userId: message.author.id });

        if (!userConfig) {
            userConfig = new UserConfig({ userId: message.author.id, whitelist: [] });
        }

        if (!userConfig.whitelist.includes(targetUser.id)) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***<@${targetUser.id}> is not whitelisted .***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        userConfig.whitelist = userConfig.whitelist.filter(id => id !== targetUser.id);
        await userConfig.save();

        const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${theme.emojis.yes}・<@${targetUser.id}> has been removed from the whitelist.***`)
            );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
    },
};