const { ContainerBuilder, TextDisplayBuilder, MessageFlags, ChannelType } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");

module.exports = {
  name: "status",
  description: "Set a status/description for your temporary voice channel.",
  category: "voice",
  cooldown: 8,
  async execute(message, args) {
    const { member, guild, client } = message;
    const theme = await themeManager.getTheme(guild.id);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・**Error:** You must be in a voice channel***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({
      channelId: member.voice.channel.id,
      guildId: guild.id
    });

    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning:** This is not a temporary voice channel***`, theme.color);
    }

    if (voiceData.ownerId !== member.id) {
      return sendEmbed(message, `***${theme.emojis.no}・**Error:** Only the channel owner can change its status***`, theme.color);
    }

    const newStatus = args.join(" ");
    if (!newStatus) {
      return sendEmbed(message, `***${theme.emojis.info}・**Usage:** \`status <your text>\`***`, theme.color);
    }

    const channel = member.voice.channel;

    try {
      if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
        // نعدل الحالة باستخدام REST API (لان discord.js ما يدعمها بشكل مباشر)
        await client.rest.patch(`/channels/${channel.id}`, {
          body: {
            rtc_channel_status: newStatus.slice(0, 120)
          }
        });
      } else if (channel.type === ChannelType.GuildText) {
        await channel.setTopic(newStatus.slice(0, 120));
      } else {
        return sendEmbed(
          message,
          `***${theme.emojis.no}・**Error:** This channel type does not support status.***`,
          theme.color
        );
      }

      return sendEmbed(
        message,
        `***${theme.emojis.yes}・Channel status updated to:\n> **${newStatus}*****`,
        theme.color
      );
    } catch (err) {
      console.error("Status error:", err);
      return sendEmbed(message, `***${theme.emojis.no}・**Error:** Failed to set status***`, theme.color);
    }
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
