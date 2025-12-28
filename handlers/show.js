const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const UserVoiceTime = require('../models/UserVoiceTime');
const themeManager = require('../utils/themeManager');

module.exports = {
    name: 'show',
    async execute(interaction) {
        const { member, guild } = interaction;
        const theme = await themeManager.getTheme(guild.id);

        // Check if this is the "show my rank" button
        if (interaction.customId === 'show_my_rank') {
            await interaction.deferReply({ flags: [MessageFlags.IsComponentsV2, 64] });

            try {
                // Get user's voice time
                const userVoiceTime = await UserVoiceTime.findOne({ 
                    userId: member.id, 
                    guildId: guild.id 
                });

                if (!userVoiceTime) {
                    return interaction.editReply({
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder()
                                        .setContent(`***# Your Voice Rank***\n\n***You haven't spent any time in voice channels yet.***`)
                                )
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder()
                                        .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
                                )
                        ],
                        flags: [MessageFlags.IsComponentsV2]
                    });
                }

                // Calculate user's rank
                const higherRankedUsers = await UserVoiceTime.countDocuments({
                    guildId: guild.id,
                    totalSeconds: { $gt: userVoiceTime.totalSeconds }
                });

                const rank = higherRankedUsers + 1;

                // Format time
                const hours = Math.floor(userVoiceTime.totalSeconds / 3600);
                const minutes = Math.floor((userVoiceTime.totalSeconds % 3600) / 60);
                const seconds = Math.floor(userVoiceTime.totalSeconds % 60);

                // Get total users in leaderboard
                const totalUsers = await UserVoiceTime.countDocuments({ guildId: guild.id });

                // Create response
                const container = new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`***# Your Voice Rank***\n\n` +
                                `***Rank: #${rank} of ${totalUsers}***\n` +
                                `***Time: ${hours}h ${minutes}m ${seconds}s***\n` +
                                `***User: ${member.user.tag}***`)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
                    );

                return interaction.editReply({
                    components: [container],
                    flags: [MessageFlags.IsComponentsV2]
                });

            } catch (error) {
                console.error('Show My Rank error:', error);
                
                const container = new ContainerBuilder()
                    .setAccentColor(0xFF0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`***# Your Voice Rank***\n\n***Failed to fetch your rank: ${error.message}***`)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
                    );

                return interaction.editReply({
                    components: [container],
                    flags: [MessageFlags.IsComponentsV2]
                });
            }
        }
        // If it's not show_my_rank, we can add other show-related functionality here in the future
    }
};