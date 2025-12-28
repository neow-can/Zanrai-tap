const { ContainerBuilder, TextDisplayBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder, SeparatorBuilder } = require('discord.js');
const UserVoiceTime = require('../../models/UserVoiceTime');
const themeManager = require('../../utils/themeManager');

module.exports = {
    name: 'list-voice-times',
    description: 'List all voice times in the database',
    category: "test",
    async execute(message, args) {
        const { guild } = message;
        const theme = await themeManager.getTheme(guild.id);

        try {
            // جلب البيانات مع ترتيبها من الأكثر وقتاً إلى الأقل
            const allVoiceTimes = await UserVoiceTime.find({ guildId: guild.id })
                .sort({ totalSeconds: -1 }) 
                .lean();

            // التحقق من وجود بيانات
            if (allVoiceTimes.length === 0) {
                const container = new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent(`***# Voice Times List***\n***No voice time data found.***`)
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder()
                                    .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                            )
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`***${guild.name} • <t:${Math.floor(Date.now() / 1000)}:F>***`)
                    );

                return message.channel.send({
                    components: [container],
                    flags: [MessageFlags.IsComponentsV2]
                });
            }

            let responseText = `***# Voice Times List***\n`;

            // حلقة تكرار لأول 10 أشخاص
            for (let i = 0; i < Math.min(allVoiceTimes.length, 10); i++) {
                const voiceTime = allVoiceTimes[i];
                
                // حساب الوقت
                const hours = Math.floor(voiceTime.totalSeconds / 3600);
                const minutes = Math.floor((voiceTime.totalSeconds % 3600) / 60);
                const seconds = Math.floor(voiceTime.totalSeconds % 60);

                // تنسيق الأرقام لتكون خانتين دائماً (05m بدلاً من 5m)
                const hStr = hours.toString().padStart(2, '0');
                const mStr = minutes.toString().padStart(2, '0');
                const sStr = seconds.toString().padStart(2, '0');

                // إضافة السطر مع التاغ (Mention)
                // تم استخدام `` للكود حول الوقت لجعله مميزاً
                responseText += `**#${i + 1}** <@${voiceTime.userId}> — \`${hStr}h ${mStr}m ${sStr}s\`\n`;
            }

            // إضافة نص في حال وجود أكثر من 10 أشخاص
            if (allVoiceTimes.length > 10) {
                responseText += `\n***... and ${allVoiceTimes.length - 10} more users***`;
            }

            const container = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(responseText)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`***${guild.name} • <t:${Math.floor(Date.now() / 1000)}:F>***`)
                );

            await message.channel.send({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            });

        } catch (error) {
            console.error('List voice times error:', error);

            const container = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`***# Voice Times List***\n***❌ Failed to list voice times: ${error.message}***`)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`***${guild.name} • <t:${Math.floor(Date.now() / 1000)}:F>***`)
                );

            await message.channel.send({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            });
        }
    }
};