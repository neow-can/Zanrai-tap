const { ContainerBuilder, TextDisplayBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder, SeparatorBuilder } = require('discord.js');
const UserVoiceTime = require('../../models/UserVoiceTime');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'check-voice-time',
    description: 'Check voice time for a user',
    category: "leaderboard",
    async execute(message, args) {
        const { guild, member } = message;
        const theme = await themeManager.getTheme(guild.id);
        
        try {
            // Get voice time for user
            const userVoiceTime = await UserVoiceTime.findOne({ 
                userId: member.id, 
                guildId: guild.id 
            });
            
            if (!userVoiceTime) {
                const container = new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent(`***# Voice Time Check***\n***No voice time data found for you.***`)
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
                    
                return message.channel.send({
                    components: [container],
                    flags: [MessageFlags.IsComponentsV2]
                });
            }
            
            // Format time
            const hours = Math.floor(userVoiceTime.totalSeconds / 3600);
            const minutes = Math.floor((userVoiceTime.totalSeconds % 3600) / 60);
            const seconds = Math.floor(userVoiceTime.totalSeconds % 60);
            
            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`***# Voice Time Check***\n` +
                                    `***Total Time: ${hours}h ${minutes}m ${seconds}s***\n` +
                                    `***Last Join Time: ${userVoiceTime.lastJoinTime ? new Date(userVoiceTime.lastJoinTime).toISOString() : 'Not in a channel'}***\n` +
                                    `***Current Channel: ${userVoiceTime.currentChannelId || 'None'}***\n` +
                                    `***Last Updated: ${new Date(userVoiceTime.lastUpdated).toISOString()}***`)
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
            console.error('Check voice time error:', error);
            
            const container = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`***# Voice Time Check***\n***❌ Failed to check voice time: ${error.message}***`)
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
    }
};