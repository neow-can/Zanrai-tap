const mongoose = require("mongoose");
const config = require('../utils/config');
const mongodbURL = config.mongodbURL;
const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Bot logged in as ${client.user.tag}`);

        // Set Custom Status
        client.user.setPresence({
            activities: [
                {
                    name: '.v Halp|𝙂𝙤𝙤𝙙𝙋𝙡𝙖𝙘𝙚',
                    state: '.v Halp|𝙂𝙤𝙤𝙙𝙋𝙡𝙖𝙘𝙚',
                    type: ActivityType.Custom,
                    emoji: { name: '🟢' }
                }
            ],
            status: 'idle'
        });

        // Connect to MongoDB
        if (!mongodbURL) return;

        await mongoose.connect(mongodbURL, {
            keepAlive: true,
            useNewUrlParser: true,
            useUnifiedTopology: true // ← التصحيح هنا بدل userUnifiedTopology
        });

        if (mongoose.connection.readyState === 1) {
            console.log("The database is running!");
        }
    },
};