const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const UserVoiceTime = require('../../models/UserVoiceTime');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'leaderboard',
    description: 'Display voice channel leaderboard',
    category: "user",
    aliases: ['lb', 'top'],
    async execute(message, args) {
        const { guild } = message;
        const theme = await themeManager.getTheme(guild.id);

        try {
            // Fetch top 10 users by voice time
            const topUsers = await UserVoiceTime.find({ guildId: guild.id })
                .sort({ totalSeconds: -1 })
                .limit(10)
                .lean();

            // Format the leaderboard
            let leaderboardText = '***# Voice Channel Leaderboard***\n\n';

            if (topUsers.length === 0) {
                leaderboardText += '***No voice time data available yet.***\n\n';
            } else {
                for (let i = 0; i < topUsers.length; i++) {
                    const userTime = topUsers[i];
                    const hours = Math.floor(userTime.totalSeconds / 3600);
                    const minutes = Math.floor((userTime.totalSeconds % 3600) / 60);
                    const seconds = Math.floor(userTime.totalSeconds % 60);
                    
                    // Simplified position display without emojis
                    leaderboardText += `***#${i + 1} <@${userTime.userId}> - ${hours}h ${minutes}m ${seconds}s***\n`;
                }
            }

            // Create container with leaderboard
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(leaderboardText)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('show_my_rank')
                            .setLabel('Show My Rank')
                            .setStyle(ButtonStyle.Secondary) // Changed to Secondary style
                    )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                    .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
                );

            await message.channel.send({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            });

        } catch (error) {
            console.error('Leaderboard command error:', error);
            
            const container = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`***# Voice Channel Leaderboard***\n\n***Failed to fetch leaderboard: ${error.message}***`)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                    .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
                );

            await message.channel.send({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            });
        }
    },
};