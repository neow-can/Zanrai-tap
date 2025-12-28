const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SectionBuilder, ThumbnailBuilder, SeparatorBuilder } = require('discord.js');
const UserVoiceTime = require('../../models/UserVoiceTime');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'topsv',
    description: 'Displays the leaderboard functionality',
    category: "leaderboard",
    async execute(message, args) {
        const { guild, member } = message;
        const theme = await themeManager.getTheme(guild.id);

        // Add some test data
        await UserVoiceTime.findOneAndUpdate(
            { userId: member.id, guildId: guild.id },
            { 
                $inc: { totalSeconds: 3600 }, // Add 1 hour
                $set: { lastUpdated: new Date() }
            },
            { upsert: true, new: true }
        );

        // Now test the leaderboard
        const topUsers = await UserVoiceTime.find({ guildId: guild.id })
            .sort({ totalSeconds: -1 })
            .limit(10)
            .lean();

            let leaderboardText = `***# 🏆 Voice Channel Leaderboard ${guild.name}***\n`;
        
        if (topUsers.length === 0) {
            leaderboardText += '***No voice time data available yet.***\n';
        } else {
            for (let i = 0; i < topUsers.length; i++) {
                const userTime = topUsers[i];
                const hours = Math.floor(userTime.totalSeconds / 3600);
                const minutes = Math.floor((userTime.totalSeconds % 3600) / 60);
                
                // Try to fetch user info
                let userTag = `Unknown User (<@${userTime.userId}>)`;
                let userAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';
                try {
                    const user = await guild.members.fetch(userTime.userId).catch(() => null);
                    if (user) {
                        userTag = user.user.tag;
                        userAvatar = user.user.displayAvatarURL({ dynamic: true, size: 32 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
                    }
                } catch (err) {
                    // User not found, keep the default tag
                }
                
                const positionEmoji = getPositionEmoji(i + 1);
                leaderboardText += `${positionEmoji} <@${userTime.userId}> - ***${hours}h ${minutes}m***\n`;
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
                        .setStyle(ButtonStyle.Primary)
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
    },
};

// Helper function to get position emojis
function getPositionEmoji(position) {
    switch (position) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return `#${position}`;
    }
}