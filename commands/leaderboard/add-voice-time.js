const { ContainerBuilder, TextDisplayBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder, SeparatorBuilder } = require('discord.js');
const UserVoiceTime = require('../../models/UserVoiceTime');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'add-voice-time',
    description: 'Add voice time to a user for testing',
    category: "leaderboard",
    async execute(message, args) {
        const { guild, member } = message;
        const theme = await themeManager.getTheme(guild.id);
        
        // Get hours from args or default to 1
        const hours = args[0] ? parseInt(args[0]) : 1;
        const seconds = hours * 3600;

        try {
            // Add voice time to user
            const result = await UserVoiceTime.findOneAndUpdate(
                { userId: member.id, guildId: guild.id },
                { 
                    $inc: { totalSeconds: seconds },
                    $set: { lastUpdated: new Date() }
                },
                { upsert: true, new: true }
            );

            // Format time for display
            const totalHours = Math.floor(result.totalSeconds / 3600);
            const totalMinutes = Math.floor((result.totalSeconds % 3600) / 60);
            const totalSeconds = Math.floor(result.totalSeconds % 60);

            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`***# 🕒 Voice Time Added***
***Added ${hours} hour(s) to your voice time record.***

***Your total time: ${totalHours}h ${totalMinutes}m ${totalSeconds}s***`)
                                )
                        .setThumbnailAccessory(
            new ThumbnailBuilder()
                .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
                );

            await message.channel.send({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            });
        } catch (error) {
            console.error('Add voice time error:', error);
            
            const container = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`***# 🕒 Voice Time Error***\n***❌ Failed to add voice time: ${error.message}***`)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                    .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
                );

            await message.channel.send({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            });
        }
    }
};