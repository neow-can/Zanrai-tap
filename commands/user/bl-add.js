const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const UserConfig = require('../../models/UserConfig');
const themeManager = require('../../utils/themeManager');
const DynamicVoice = require('../../models/DynamicVoice');

module.exports = {
    name: 'bl-add',
    description: 'Add a user to your personal blacklist.',
    aliases: ['blacklist-add', 'bl add'],
    category: "user",
    async execute(message, args, client) {
        const theme = await themeManager.getTheme(message.guild.id);

        const MAX_BLACKLIST_LIMIT = 10; 

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
            userConfig = new UserConfig({ userId: message.author.id, blacklist: [] });
        }

        if (userConfig.blacklist.includes(targetUser.id)) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***<@${targetUser.id}> is already in your blacklist.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        if (userConfig.whitelist.includes(targetUser.id)) {
            userConfig.whitelist = userConfig.whitelist.filter(id => id !== targetUser.id);
        }

        if (userConfig.blacklist.length >= MAX_BLACKLIST_LIMIT) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.info}・You can only blacklist a maximum of ${MAX_BLACKLIST_LIMIT} users.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        userConfig.blacklist.push(targetUser.id);
        await userConfig.save();

        const dynamicVoiceChannels = await DynamicVoice.find({ ownerId: message.author.id });
        for (const channelData of dynamicVoiceChannels) {
            const channel = message.guild.channels.cache.get(channelData.channelId);
            if (channel) {
                try {
                    await channel.permissionOverwrites.edit(targetUser.id, {
                        Connect: false,
                    });
                } catch (error) {
                    console.error(`Failed to update permissions for channel ${channel.name}:`, error);
                }
            }
        }


        const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${theme.emojis.yes}・<@${targetUser.id}> has been added to your blacklist. Reason: ${reason || 'None provided'}***`)
            );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
    },
};