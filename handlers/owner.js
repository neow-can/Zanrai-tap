const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../models/DynamicVoice");
const UserConfig = require("../models/UserConfig");
const themeManager = require("../utils/themeManager");

module.exports = {
    name: "owner_button", 
    async execute(interaction) {
        const { member, guild } = interaction;
        
        try {
            // Fetch theme first to ensure it's available
            const theme = await themeManager.getTheme(guild.id);
            
            // Helper function for sending embeds
            const sendEmbed = (description, flags = 64) => {
                return interaction.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                            .addTextDisplayComponents(
                              new TextDisplayBuilder()
                                .setContent(`***${description}***`)
                            )
                    ],
                    flags: [MessageFlags.IsComponentsV2, 64]
                });
            };
            
            // Check if member is in a voice channel
            if (!member.voice?.channel) {
                return sendEmbed(`***${theme.emojis.no}・You must be in a voice channel***`);
            }
            
            // Find voice channel data
            const voiceData = await DynamicVoice.findOne({ 
                channelId: member.voice.channel.id,
                guildId: guild.id
            });
            
            if (!voiceData) {
                return sendEmbed(`***${theme.emojis.info}・This is not a temporary voice channel***`);
            }
            
            // Try to fetch the owner
            const owner = await guild.members.fetch(voiceData.ownerId)
                .catch(() => null);
                
            if (!owner) {
                return sendEmbed(`***${theme.emojis.info}・The owner of this channel is no longer in the server***`);
            }
            
            // Try to fetch any channel managers
            const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId })
                .catch(() => null);
            
            const managers = ownerConfig?.managers || [];
            let managerText = "";
            
            // If there are managers, include them in the response
            if (managers.length > 0) {
                const managerList = managers.map(id => `<@${id}>`).join(", ");
                managerText = `\n***${theme.emojis.manager}・Channel managers: ${managerList}***`;
            }
            
            // Build a more detailed response
            const channelInfo = [
                `***${theme.emojis.owner}・<#${member.voice.channel.id}> is owned by <@${owner.id}>***`,
                managerText
            ].filter(Boolean).join("");
            
            return sendEmbed(channelInfo);
            
        } catch (error) {
            console.error("Owner button error:", error);
            
            // Check if interaction has already been replied to
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                              new TextDisplayBuilder()
                                .setContent(`***${theme.emojis.no}・Failed to fetch owner information: ${error.message}***`)
                            )
                    ],
                    flags: [MessageFlags.IsComponentsV2, 64]
                }).catch(console.error);
            }
        }
    }
};