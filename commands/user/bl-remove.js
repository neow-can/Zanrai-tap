const { ContainerBuilder, TextDisplayBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const UserConfig = require('../../models/UserConfig');
const themeManager = require('../../utils/themeManager');
const DynamicVoice = require('../../models/DynamicVoice');
module.exports = {
    name: 'bl-remove',
    description: 'Remove a user from the blacklist.',
    aliases: ['blacklist-remove', 'bl re'],
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

        let userConfig = await UserConfig.findOne({ userId: message.author.id  });

        if (!userConfig) {
            userConfig = new UserConfig({ userId: message.author.id , blacklist: []});
        }

        if (!userConfig.blacklist.includes(targetUser.id)) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***<@${targetUser.id}> is not blacklisted .***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        userConfig.blacklist = userConfig.blacklist.filter(id => id !== targetUser.id);
        await userConfig.save();

        const dynamicVoiceChannels = await DynamicVoice.find({ ownerId: message.author.id });
        for (const channelData of dynamicVoiceChannels) {
            const channel = message.guild.channels.cache.get(channelData.channelId);
            if (channel) {
                try {
                    await channel.permissionOverwrites.delete(targetUser.id)

                } catch (error) {
                    console.error(`Failed to update permissions for channel ${channel.name}:`, error);
                }
            }
        }


        const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${theme.emojis.yes}・<@${targetUser.id}> has been removed from the blacklist.***`)
            );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
    },
};