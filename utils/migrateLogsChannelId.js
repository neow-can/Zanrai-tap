const mongoose = require('mongoose');
const GuildConfig = require('../models/GuildConfig');
const { mongoURI } = require('./config');

(async () => {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const configs = await GuildConfig.find({ logsChannelId: { $exists: true } });
    let updated = 0;
    for (const config of configs) {
      if (config.logsChannelId && !config.logChannelId) {
        config.logChannelId = config.logsChannelId;
        config.logsChannelId = undefined;
        await config.save();
        updated++;
        console.log(`Migrated guild: ${config.guildId}`);
      }
    }
    console.log(`Migration complete. Updated ${updated} guild(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();