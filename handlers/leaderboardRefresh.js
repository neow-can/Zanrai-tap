const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SectionBuilder, ThumbnailBuilder, SeparatorBuilder } = require('discord.js');
const UserVoiceTime = require('../models/UserVoiceTime');
const GuildConfig = require('../models/GuildConfig');
const themeManager = require('../utils/themeManager');

// Store intervals for each guild
const refreshIntervals = new Map();

module.exports = {
    name: 'leaderboardRefresh',
    // Start auto-refresh for a guild
    startRefresh: async function(guildId, client) {
        // Clear existing interval if any
        if (refreshIntervals.has(guildId)) {
            clearInterval(refreshIntervals.get(guildId));
        }
        
        // Set up new interval
        const interval = setInterval(async () => {
            await updateLeaderboardMessage(guildId, client);
        }, 5000); // 5 seconds
        
        refreshIntervals.set(guildId, interval);
        console.log(`Started leaderboard refresh for guild ${guildId}`);
    },
    
    // Stop auto-refresh for a guild
    stopRefresh: function(guildId) {
        if (refreshIntervals.has(guildId)) {
            clearInterval(refreshIntervals.get(guildId));
            refreshIntervals.delete(guildId);
            console.log(`Stopped leaderboard refresh for guild ${guildId}`);
        }
    },
    
    // Update leaderboard immediately
    updateNow: async function(guildId, client) {
        await updateLeaderboardMessage(guildId, client);
    }
};

async function updateLeaderboardMessage(guildId, client) {
    try {
        // Get guild config
        const guildConfig = await GuildConfig.findOne({ guildId });
        if (!guildConfig || !guildConfig.leaderboardChannelId) return;
        
        // Get guild and channel
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        
        const channel = guild.channels.cache.get(guildConfig.leaderboardChannelId);
        if (!channel) return;
        
        // Get theme
        const theme = await themeManager.getTheme(guildId);
        
        // Fetch top 10 users by voice time
        const topUsers = await UserVoiceTime.find({ guildId })
            .sort({ totalSeconds: -1 })
            .limit(10)
            .lean();
        
        // Format the leaderboard
        let leaderboardText = '***# Voice Channel Leaderboard***\n';
        
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
        
        const section = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(leaderboardText)
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder()
                    .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
            );

        const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addSectionComponents(section)
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('show_my_rank')
                        .setLabel('Show My Rank')
                        .setStyle(ButtonStyle.Secondary)
                )
            )
            .addSeparatorComponents(new SeparatorBuilder());
        // Add footer with guild name and timestamp inside the embed
        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
        );
        
        // Try to get the specific leaderboard message by ID
        let leaderboardMessage = null;
        if (guildConfig.leaderboardMessageId) {
            try {
                leaderboardMessage = await channel.messages.fetch(guildConfig.leaderboardMessageId);
            } catch (err) {
                console.log(`Leaderboard message not found, will send a new one`);
                // Message not found, we'll send a new one
            }
        }
        
        // If no existing message found, send a new one
        if (!leaderboardMessage) {
            leaderboardMessage = await channel.send({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            });
            
            // Update the config with the new message ID
            guildConfig.leaderboardMessageId = leaderboardMessage.id;
            await guildConfig.save();
        } else {
            // Update existing message
            await leaderboardMessage.edit({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            });
        }
    } catch (error) {
        console.error(`Error updating leaderboard for guild ${guildId}:`, error);
    }
}