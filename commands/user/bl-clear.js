const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const UserConfig = require('../../models/UserConfig');
const themeManager = require('../../utils/themeManager');
const DynamicVoice = require('../../models/DynamicVoice');

module.exports = {
    name: 'bl-clear',
    description: 'Clear your blacklist.',
    aliases: ['blacklist-clear', "bl clear"],
    category: "user",
    async execute(message, args, client) {
        const theme = await themeManager.getTheme(message.guild.id);

        let userConfig = await UserConfig.findOne({ userId: message.author.id });

        if (!userConfig || userConfig.blacklist.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***${theme.emojis.info}・Your blacklist is already empty.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        const dynamicVoiceChannels = await DynamicVoice.find({ ownerId: message.author.id });

        let clearedCount = 0;
        for (const channelData of dynamicVoiceChannels) {
            const channel = message.guild.channels.cache.get(channelData.channelId);
            if (channel) {
                try {
                    for (const blacklistedUserId of userConfig.blacklist) {
                        const overwrite = channel.permissionOverwrites.cache.get(blacklistedUserId);
                        if (overwrite) {
                            await channel.permissionOverwrites.delete(blacklistedUserId);
                            clearedCount++;
                        }
                    }
                } catch (error) {
                    console.error(`Failed to clear permissions for channel ${channel.name}:`, error);
                }
            }
        }

        userConfig.blacklist = []; 
        await userConfig.save();

        const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${theme.emojis.yes}・Your blacklist has been cleared.***`)
            );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
    },
};