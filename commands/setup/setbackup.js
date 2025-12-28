 const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
 const GuildConfig = require('../../models/GuildConfig');
 const themeManager = require('../../utils/themeManager');

 module.exports = {
   name: 'second-category',
   description: 'Set a backup category for temporary voice channels',
   category: 'setup',
   async execute(message, args) {
     const guildId = message.guild.id
     const categoryId = args[0];
    const theme = await themeManager.getTheme(guildId);
     if (!categoryId) {
       const container = new ContainerBuilder()
         .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
         .addTextDisplayComponents(
           new TextDisplayBuilder()
             .setContent('***Please provide a category ID.***')
         );
       return message.reply({ 
         components: [container],
         flags: [MessageFlags.IsComponentsV2]
       });
     }

     const category = message.guild.channels.cache.get(categoryId);
     if (!category || category.type !== 4) {
       const container = new ContainerBuilder()
         .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
         .addTextDisplayComponents(
           new TextDisplayBuilder()
             .setContent('***Please provide a valid category ID.***')
         );
       return message.reply({ 
         components: [container],
         flags: [MessageFlags.IsComponentsV2]
       });
     }

     await GuildConfig.findOneAndUpdate(
       { guildId: guildId },
       { backupCategoryId: category.id },
       { upsert: true, new: true },
     );

     const container = new ContainerBuilder()
       .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
       .addTextDisplayComponents(
         new TextDisplayBuilder()
           .setContent(`***${theme.emojis.yes}・Backup category set to **${category.name}**!***`)
       );

     await message.reply({ 
       components: [container],
       flags: [MessageFlags.IsComponentsV2],
       ephemeral: true  
     });
   },
 };