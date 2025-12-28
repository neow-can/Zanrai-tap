const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const DynamicVoice = require("../models/DynamicVoice");
const themeManager = require("../utils/themeManager");
const UserConfig = require("../models/UserConfig");

module.exports = {
  async execute(interaction) {
    const member = interaction.member;
    const guild = interaction.guild;

    if (!guild || !member) return;

    const theme = await themeManager.getTheme(guild.id) || {
      color: "#5865f2",
      emojis: {
        no: "❌",
        info: "ℹ️",
        unlock: "🔓"
      }
    };

    // Check voice channel
    if (!member.voice.channel) {
      return interaction.reply({
        components: [new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・You must be in a voice channel to unlock it.***`)
          )],
        flags: [MessageFlags.IsComponentsV2, 64]
      });
    }

    const channel = member.voice.channel;

    const voiceData = await DynamicVoice.findOne({
      channelId: channel.id,
      guildId: guild.id
    });

    if (!voiceData) {
      return interaction.reply({
        components: [new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.info}・This is not a temporary voice channel.***`)
          )],
        flags: [MessageFlags.IsComponentsV2, 64]
      });
    }

    const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId });
    const managers = ownerConfig?.managers || [];

    if (voiceData.ownerId !== member.id && !managers.includes(member.id)) {
      return interaction.reply({
        components: [new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.info}・You must be the owner to unlock this channel.***`)
          )],
        flags: [MessageFlags.IsComponentsV2, 64]
      });
    }

    const everyonePerms = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);

    if (!everyonePerms || !everyonePerms.deny.has(PermissionFlagsBits.Connect)) {
      return interaction.reply({
        components: [new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.info}・This voice channel is already unlocked.***`)
          )],
        flags: [MessageFlags.IsComponentsV2, 64]
      });
    }

    try {
      await Promise.all([
        channel.permissionOverwrites.edit(guild.roles.everyone, {
          Connect: null // Allow Connect by removing deny
        }),
        DynamicVoice.updateOne({ channelId: channel.id }, { $set: { isLocked: false } })
      ]);

      return interaction.reply({
        components: [new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.unlock}・Your voice channel has been unlocked.***`)
          )],
        flags: [MessageFlags.IsComponentsV2, 64]
      });
    } catch (error) {
      console.error("Error unlocking channel:", error);
      return interaction.reply({
        components: [new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・Failed to unlock channel: ${error.message}***`)
          )],
        flags: [MessageFlags.IsComponentsV2],
        ephemeral: true
      });
    }
  }
};