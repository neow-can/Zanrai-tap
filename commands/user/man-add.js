const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const UserConfig = require('../../models/UserConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'manadd',
    description: 'Add a user as a manager.',
    aliases: ['manager-add', 'man-add', 'man add'],
    category: "user",
    async execute(message, args, client) {
        const theme = await themeManager.getTheme(message.guild.id);

        const MAX_MANAGERS_LIMIT = 8;

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

        if (targetUser.id === message.author.id) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.no}・You cannot blacklist yourself.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        let userConfig = await UserConfig.findOne({ userId: message.author.id });
        if (!userConfig) {
            userConfig = new UserConfig({ userId: message.author.id, managers: [], blacklist: []  });
        }

        if (userConfig.blacklistedUsers && userConfig.blacklistedUsers.includes(targetUser.id)) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.no}・<@${targetUser.id}> is blacklisted and cannot be added as a manager.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }
        
        if (userConfig.managers.includes(targetUser.id)) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***<@${targetUser.id}> is already a manager.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        if (userConfig.managers.length >= MAX_MANAGERS_LIMIT) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.info}・You can only have a maximum of ${MAX_MANAGERS_LIMIT} managers.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        userConfig.managers.push(targetUser.id);
        await userConfig.save();

        const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${theme.emojis.yes}・<@${targetUser.id}> has been added as a manager.***`)
            );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
    },
};