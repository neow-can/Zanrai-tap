const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");
const UserConfig = require("../../models/UserConfig");

module.exports = {
  name: "claim",
  description: "Claim ownership of an abandoned voice channel",
  category: "voice",
  cooldown: 6,
  async execute(message) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);

    try {
      const timeLeft = cooldownHandler.checkCooldown("claim", message.author.id, 6);
      if (timeLeft) {
        message.delete();
        return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
          setTimeout(() => msg.delete(), 5000);
        });
      }

      cooldownHandler.applyCooldown("claim", message.author.id, 6);

      if (!member.voice.channel) {
        return sendEmbed(message, `***${theme.emojis.no}・**Error!** You must be in a voice channel to claim it***`, theme.color);
      }

      const voiceData = await DynamicVoice.findOne({ 
        channelId: member.voice.channel.id 
      });
      
      if (!voiceData) {
        return sendEmbed(message, `***${theme.emojis.info}・**Warning!** This is not a temporary voice channel***`, theme.color);
      }

      if (voiceData.ownerId === member.id) {
        return sendEmbed(message, `***${theme.emojis.owner}・**Warning!** ${member} you are already the owner!***`, theme.color);
      }

      const currentOwner = guild.members.cache.get(voiceData.ownerId);
      if (currentOwner?.voice.channelId === member.voice.channel.id) {
        return sendEmbed(message, `***${theme.emojis.owner}・**Warning!** Channel is already owned by <@${currentOwner.id}>***`, theme.color);
      }

      const channel = member.voice.channel;
      
      // حذف أذونات الشخص القديم فقط وليس الرولات
      if (voiceData.ownerId && voiceData.ownerId !== member.id) {
        try {
          await channel.permissionOverwrites.delete(voiceData.ownerId);
        } catch (error) {
          console.log(`Failed to remove permissions for previous owner (${voiceData.ownerId}): ${error.message}`);
        }
      }

      // تحديث قاعدة البيانات
      await DynamicVoice.updateOne(
        { channelId: member.voice.channel.id },
        { 
          $set: { 
            ownerId: member.id,
            allowedUsers: [],
            rejectedUsers: [] 
          } 
        }
      );

      // إعطاء أذونات للمالك الجديد
      await member.voice.channel.permissionOverwrites.edit(member.id, {
        Connect: true,
        Speak: true,
        ManageChannels: true,
        MoveMembers: true,
      });

      return sendEmbed(message, `***${theme.emojis.owner}・**Success!**${member} has successfully claimed ownership of <#${member.voice.channel.id}>!***`, theme.color);

    } catch (error) {
      console.error("Claim command error:", error);
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** Failed to claim voice channel: ${error.message}***`, theme.color);
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