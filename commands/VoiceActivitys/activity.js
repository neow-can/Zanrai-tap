const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const DynamicVoice = require('../../models/DynamicVoice');
const themeManager = require('../../utils/themeManager');
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: 'activity',
  description: 'Enable/disable Activities in your voice channel',
  aliases: ["ac"],
  category: "voice",
  cooldown:8,
  async execute(message, args) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);
    const action = args[0]?.toLowerCase();

    const timeLeft = cooldownHandler.checkCooldown("activity", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("activity", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({
      channelId: member.voice.channel.id,
      guildId: guild.id
    });

    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
    }

    if (voiceData.ownerId !== member.id ) {
      return sendEmbed(message, `***${theme.emojis.info}・Only the channel owner can manage activities***`, theme.color);
    }

    if (!action || !['on', 'off', 'enable', 'disable'].includes(action)) {
      return sendEmbed(message, `***${theme.emojis.info}・Please specify \`'on'\` or \`'off'\`***`, theme.color);
    }

    const currentPermissions = member.voice.channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    const currentActivityAllowed = currentPermissions
      ? currentPermissions.allow.has(PermissionFlagsBits.UseEmbeddedActivities)
      : true;

    const newState = action === 'on' ? true : false;

    if (currentActivityAllowed === newState) {
      const response = newState
        ? `***${theme.emojis.activity}・Activities are already \`enabled\` in this channel***`
        : `***${theme.emojis.activity}・Activities are already \`disabled\` in this channel***`;
      return sendEmbed(message, response, theme.color);
    }

    await member.voice.channel.permissionOverwrites.edit(guild.roles.everyone, {
      [PermissionFlagsBits.UseEmbeddedActivities]: newState
    });

    const response = newState
      ? `***${theme.emojis.yes}・Activities have been **enabled*****`
      : `***${theme.emojis.yes}・Activities have been **disabled*****`;
    return sendEmbed(message, response, theme.color);
  }
};

function sendEmbed(message, description, color) {
    const container = new ContainerBuilder()
      .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(description)
      );
    return message.channel.send({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
  }