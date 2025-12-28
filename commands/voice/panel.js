const { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags,
  MediaGalleryBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder
} = require('discord.js');

const themeManager = require('../../utils/themeManager');
const config = require('../../utils/config');
const DynamicVoice = require('../../models/DynamicVoice');
const cooldownHandler = require("../../events/cooldown");

module.exports = {
    name: 'panel',
    description: 'Display panel with available commands',
    category: "voice",
    cooldown: 8,
    async execute(message, args, interaction) {
      const { member, guild } = message;
      const theme = await themeManager.getTheme(guild.id);

      const timeLeft = cooldownHandler.checkCooldown("panel", message.author.id, 8);
      if (timeLeft) {
        message.delete();
        return sendEmbed(message, `***Please wait ${timeLeft} seconds***`, theme.color, theme.image).then(msg => {
          setTimeout(() => msg.delete(), 5000);
        });
      }
  
      cooldownHandler.applyCooldown("panel", message.author.id, 8);

      // ---------------------------
      // MAIN CONTAINER
      // ---------------------------
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)

        // SECTION (الكلام + صورة السيرفر)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                '***## Voice Channel Control Panel***\n' +
                '***- Control your voice channel using the buttons below***\n' +
                '***- Use `.v help` for all commands***\n' +
                '***- Need help? Contact the developer for support***'
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(
                guild.iconURL({ dynamic: true, size: 256 }) ||
                'https://cdn.discordapp.com/embed/avatars/0.png'
              )
            )
        )

        // فاصل بين الكلام والصورة
        .addSeparatorComponents(new SeparatorBuilder());

      // MEDIA (صورة الثيم)
      if (theme.image) {
        const mediaGallery = new MediaGalleryBuilder().addItems([
          { media: { url: theme.image } }
        ]);
        container.addMediaGalleryComponents(mediaGallery);
      }

      // فاصل بين الصورة والأزرار
      container.addSeparatorComponents(new SeparatorBuilder());

      // ---------------------------
      // BUTTONS ROW 1
      // ---------------------------
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('lock_button')
          .setEmoji(`${theme.emojis.lock}`)
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('unlock_button')
          .setEmoji(`${theme.emojis.unlock}`)
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('claim_button')
          .setEmoji(`${theme.emojis.owner}`)
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('hide_button')
          .setEmoji(`${theme.emojis.hide}`)
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('unhide_button')
          .setEmoji(`${theme.emojis.show}`)
          .setStyle(ButtonStyle.Secondary),
      );

      // ---------------------------
      // BUTTONS ROW 2
      // ---------------------------
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('owner_button')
          .setEmoji(`${theme.emojis.owner}`)
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('vcreset_button')
          .setEmoji(`${theme.emojis.transfer}`)
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('limit_button')
          .setEmoji(`${theme.emojis.limit}`)
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('name_button')
          .setEmoji(`${theme.emojis.name}`)
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('info_button')
          .setEmoji(`${theme.emojis.info}`)
          .setStyle(ButtonStyle.Secondary),
      );

      // ---------------------------
      // SEND PANEL
      // ---------------------------
      await message.channel.send({ 
        components: [
          container
            .addActionRowComponents(row)
            .addActionRowComponents(row2)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });

    },
};

// ---------------------------
// EMBED FUNCTION
// ---------------------------
function sendEmbed(message, description, color, image) {
  const container = new ContainerBuilder()
    .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `***# Voice Panel***\n\n***${description}***`
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(
            message.guild?.iconURL({ dynamic: true, size: 256 }) ||
            'https://cdn.discordapp.com/embed/avatars/0.png'
          )
        )
    );

  if (image) {
    const mediaGallery = new MediaGalleryBuilder().addItems([
      { media: { url: image } }
    ]);
    container.addMediaGalleryComponents(mediaGallery);
  }

  return message.channel.send({
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  });
}