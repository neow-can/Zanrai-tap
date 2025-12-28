const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "transfer",
  description: "Transfer ownership of your Tempy Voice",
  category: "voice",
  cooldown: 8,
  async execute(message, args) {
    const { member, guild, mentions } = message;
    const theme = await themeManager.getTheme(guild.id);
    const targetMember = mentions.members.first() || guild.members.cache.get(args[0]);

    const timeLeft = cooldownHandler.checkCooldown("transfer", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`, theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("transfer", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・${member} you must be in a voice channel***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({
      channelId: member.voice.channel.id,
      guildId: guild.id
    });

    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・${member} this is not a Tempy Voice channel***`, theme.color);
    }

    if (voiceData.ownerId !== member.id) {
      return sendEmbed(message, `***${theme.emojis.info}・${member} only the current owner can transfer ownership***`, theme.color);
    }

    if (!targetMember) {
      return sendEmbed(message, `***${theme.emojis.info}・${member} please provide a valid user***`, theme.color);
    }

    if (targetMember.id === member.id) {
      return sendEmbed(message, `***${theme.emojis.info}・${member} you are already the owner***`, theme.color);
    }

    try {
      await member.voice.channel.permissionOverwrites.edit(targetMember.id, {
        Connect: true,
        Speak: true,
      });

      await member.voice.channel.permissionOverwrites.delete(member.id);

      await DynamicVoice.updateOne(
        { channelId: member.voice.channel.id },
        { 
          $set: { 
            ownerId: targetMember.id,
            allowedUsers: [],
            rejectedUsers: [] 
          } 
        }
      );

      return sendEmbed(message, `***${theme.emojis.transfer}・${member} has transferred ownership to ${targetMember}***`, theme.color);

    } catch (error) {
      console.error("Transfer error:", error);
      return sendEmbed(message, `***${theme.emojis.no}・${member} failed to transfer ownership: ${error.message}***`, theme.color);
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
