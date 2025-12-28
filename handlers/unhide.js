const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../models/DynamicVoice");
const GuildConfig = require("../models/GuildConfig");
const themeManager = require("../utils/themeManager");

module.exports = {
    name: "unhide_button",
    async execute(interaction) {
        const { member, guild } = interaction;
        const theme = await themeManager.getTheme(guild.id);

        try {
            if (!member.voice.channel) {
                return sendEmbed(interaction, `***${theme.emojis.no}・You must be in a voice channel to unhide it***`, theme.color);
            }
            const voiceData = await DynamicVoice.findOne({
                channelId: member.voice.channel.id,
                guildId: guild.id,
            });
            if (!voiceData) {
                return sendEmbed(interaction, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
            }

            if (voiceData.ownerId !== member.id) {
                return sendEmbed(interaction, `***${theme.emojis.no}・You must be the owner to unhide it***`, theme.color);
            }

            const guildConfig = await GuildConfig.findOne({ guildId: guild.id });

            if (!guildConfig?.hideShowRoleId || !member.roles.cache.has(guildConfig.hideShowRoleId)) {
                return sendEmbed(interaction, `***${theme.emojis.no}・You don't have permission to unhide voice channels***`, theme.color);
            }

            const channel = guild.channels.cache.get(member.voice.channel.id);

            await Promise.all([
                channel.permissionOverwrites.edit(guild.id, {
                    ViewChannel: true, 
                }),
                DynamicVoice.updateOne(
                    { channelId: member.voice.channel.id },
                    { $set: { isHidden: false } }
                ),
            ]);

            return sendEmbed(interaction, `***${theme.emojis.yes}・Voice channel is now visible***`, theme.color);

        } catch (error) {
            console.error("UnhideVC command error:", error);
            return sendEmbed(interaction, `***${theme.emojis.no}・Failed to unhide channel: ${error.message}***`, theme.color);
        }
    },
};

function sendEmbed(interaction, description, color) {
    const container = new ContainerBuilder()
        .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${description}***`)
        );

    return interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2, 64] });
}