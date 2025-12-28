const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../models/DynamicVoice");
const themeManager = require("../utils/themeManager");

module.exports = {
  name: "vcreset_button",
  async execute(interaction) {
    const { member, guild } = interaction;
    const theme = await themeManager.getTheme(guild.id);

    await interaction.deferReply({ flags: [MessageFlags.IsComponentsV2, 64] });

    try {
      if (!member.voice.channel) {
        return interaction.editReply({ 
          components: [
            new ContainerBuilder()
              .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`***${theme.emojis.no}・You must be in the voice channel to reset it***`)
              )
          ],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const channel = member.voice.channel;
      
      const voiceData = await DynamicVoice.findOne({ channelId: channel.id });
      if (!voiceData) {
        return interaction.editReply({ 
          components: [
            new ContainerBuilder()
              .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`***${theme.emojis.info}・This is not a temporary voice channel***`)
              )
          ],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (voiceData.ownerId !== member.id) {
        return interaction.editReply({ 
          components: [
            new ContainerBuilder()
              .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`***${theme.emojis.no}・Only the channel owner can reset permissions***`)
              )
          ],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const memberOverwrites = channel.permissionOverwrites.cache.filter(ow => ow.type === 1);
      await Promise.all(
        Array.from(memberOverwrites.keys()).map(id => 
          channel.permissionOverwrites.delete(id).catch(console.error)
      ));

      await channel.permissionOverwrites.edit(guild.id, {
        ViewChannel: null,
        Connect: null,
      });

      await channel.edit({
        userLimit: 0,
      });

      await DynamicVoice.updateOne(
        { channelId: channel.id },
        { 
          $set: { 
            allowedUsers: [],
            rejectedUsers: [],
          } 
        }
      );

      await channel.permissionOverwrites.edit(member.id, {
        Connect: true,
        Speak: true,
      });

      return interaction.editReply({
        components: [
          new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${theme.emojis.yes}・Voice channel has been reset***`)
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });

    } catch (error) {
      console.error("Reset command error:", error);
      return interaction.editReply({
        components: [
          new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${theme.emojis.no}・Failed to reset voice channel: ${error.message}***`)
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  }
};