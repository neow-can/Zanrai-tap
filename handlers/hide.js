const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../models/DynamicVoice");
const GuildConfig = require("../models/GuildConfig");
const themeManager = require("../utils/themeManager");

module.exports = {
    name: "hide_button",
    async execute(interaction) {
        const { member, guild } = interaction;
        
        try {
            // Fetch theme first to ensure it's available
            const theme = await themeManager.getTheme(guild.id);
            
            // Check if member is in a voice channel
            if (!member.voice?.channel) {
                return sendEmbed(interaction, `***${theme.emojis.no}・You must be in a voice channel to hide it***`, theme.color);
            }
            
            // Check if the voice channel exists in the database
            const voiceData = await DynamicVoice.findOne({
                channelId: member.voice.channel.id,
                guildId: guild.id,
            });
            
            if (!voiceData) {
                return sendEmbed(interaction, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
            }
            
            // Check if the member is the owner of the voice channel
            if (voiceData.ownerId !== member.id) {
                return sendEmbed(interaction, `***${theme.emojis.no}・You must be the owner to hide it***`, theme.color);
            }
            
            // Fetch guild configuration
            const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
            
            // Check if hide/show role is configured and member has the role
            if (!guildConfig?.hideShowRoleId || !member.roles.cache.has(guildConfig.hideShowRoleId)) {
                return sendEmbed(interaction, `***${theme.emojis.no}・You don't have permission to hide voice channels***`, theme.color);
            }
            
            // Get the channel and update permissions
            const channel = member.voice.channel;
            if (!channel) {
                return sendEmbed(interaction, `***${theme.emojis.no}・The voice channel could not be found***`, theme.color);
            }
            
            // Hide the channel from everyone in the guild
            await channel.permissionOverwrites.edit(guild.id, {
                ViewChannel: false,
            });
            
            // Ensure the owner can still see the channel
            await channel.permissionOverwrites.edit(member.id, {
                ViewChannel: true,
                Connect: true,
            });
            
            // Track that the channel is now hidden in the database
            await DynamicVoice.updateOne(
                { channelId: channel.id },
                { $set: { isHidden: true } }
            );
            
            return sendEmbed(interaction, `***${theme.emojis.yes}・Voice channel hidden successfully***`, theme.color);
        } catch (error) {
            console.error("HideVC button error:", error);
            
            // Check if interaction has already been replied to
            if (!interaction.replied && !interaction.deferred) {
                return sendEmbed(interaction, `***${theme.emojis.no}・Failed to hide channel: ${error.message}***`, "Red");
            }
        }
    },
};

function sendEmbed(interaction, description, color) {
    const container = new ContainerBuilder()
        .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(description)
        );
        
    return interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2, 64] })
        .catch(err => {
            console.error("Failed to send container:", err);
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ content: description, flags: [MessageFlags.IsComponentsV2, 64] })
                    .catch(console.error);
            }
        });
}