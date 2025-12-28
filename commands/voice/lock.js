const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, User, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const UserConfig = require("../../models/UserConfig");
const cooldownHandler = require("../../events/cooldown");
module.exports = {
  name: "lock",
  description: "Lock the voice channel",
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);
    
    // Check cooldown
    const timeLeft = cooldownHandler.checkCooldown("lock", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`, theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }
    cooldownHandler.applyCooldown("lock", message.author.id, 8);
    
    // Check if user is in a voice channel
    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** You must be in a voice channel to lock it***`, theme.color);
    }
    
    // Get voice channel data
    const voiceData = await DynamicVoice.findOne({ 
      channelId: member.voice.channel.id,
      guildId: guild.id
    });
    
    // Check if it's a temporary voice channel
    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** This is not a temporary voice channel***`, theme.color);
    }
    
    // Check ownership
    const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId });
    const managers = ownerConfig?.managers || [];
    
    if (voiceData.ownerId !== member.id && !managers.includes(member.id)) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** You must be the channel owner to lock it***`, theme.color);
    }
    
    const channel = member.voice.channel;
    const everyonePerms = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    
    // Check if channel is already locked
    if (everyonePerms && everyonePerms.deny.has(PermissionFlagsBits.Connect)) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** ${member} your voice channel is already locked***`, theme.color);
    }
    
    try {
      // Lock the channel and update database
      await Promise.all([
        member.voice.channel.permissionOverwrites.edit(guild.roles.everyone, {
          Connect: false 
        }),
        DynamicVoice.updateOne(
          { channelId: member.voice.channel.id },
          { $set: { isLocked: true } }
        )
      ]);
      
      // Channel renaming code removed from here
      
      return sendEmbed(message, `***${theme.emojis.lock}・**Success!** Channel <#${member.voice.channel.id}> has been locked successfully***`, theme.color);
    } catch (error) {
      console.error("Error locking channel:", error);
      return sendEmbed(message,
        `***${theme.emojis.no}・**Error!** ${member} failed to lock channel: ${error.message}***`,
        theme.color
      );
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