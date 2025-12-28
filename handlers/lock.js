const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const DynamicVoice = require("../models/DynamicVoice");
const themeManager = require("../utils/themeManager");
const UserConfig = require("../models/UserConfig");
module.exports = {
    name: "lock_button",
  async execute(interaction) {
    const { member, guild } = interaction;
    const theme = await themeManager.getTheme(guild.id);

    if (!member.voice.channel) {
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.no}・You must be in a voice channel to lock it***`)
        );

    return interaction.reply({
  components: [container],
  flags: [MessageFlags.IsComponentsV2, 64],
});
    }

    const voiceData = await DynamicVoice.findOne({
      channelId: member.voice.channel.id,
      guildId: guild.id,
    });

    if (!voiceData) {
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.info}・This is not a temporary voice channel***`)
        );

      return interaction.reply({
  components: [container],
  flags: [MessageFlags.IsComponentsV2, 64],
});
    }

    const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId });
    const managers = ownerConfig?.managers || [];
    if (voiceData.ownerId !== member.id && !managers.includes(member.id)) {
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.info}・You must be the owner to lock this channel***`)
        );

      return interaction.reply({
  components: [container],
  flags: [MessageFlags.IsComponentsV2, 64],
});
    }

    const channel = member.voice.channel;
    const everyonePerms = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);

    if (everyonePerms && everyonePerms.deny.has(PermissionFlagsBits.Connect)) {
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.info}・Your voice channel is already locked***`)
        );

      return interaction.reply({
  components: [container],
  flags: [MessageFlags.IsComponentsV2, 64],
});
    }

    try {
      await Promise.all([
        member.voice.channel.permissionOverwrites.edit(guild.roles.everyone, {
          Connect: false,
        }),
        DynamicVoice.updateOne(
          { channelId: member.voice.channel.id },
          { $set: { isLocked: true } }
        ),
      ]);
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.lock}・Your voice channel has been locked.***`)
        );

      return interaction.reply({
  components: [container],
  flags: [MessageFlags.IsComponentsV2, 64],
});
    } catch (error) {
      console.error("Error locking channel:", error);
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.no} Failed to lock channel: ${error.message}***`)
        );

      return interaction.reply({
  components: [container],
  flags: [MessageFlags.IsComponentsV2, 64],
});
    }
  },
};