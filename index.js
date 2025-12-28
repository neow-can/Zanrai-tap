require('dotenv').config();
const { Client, GatewayIntentBits, Collection, PermissionsBitField, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { token, mongoURI, prefix, clientId } = require('./utils/config');
const themeManager = require('./utils/themeManager');
const GuildConfig = require('./models/GuildConfig');
const slashCommandFiles = fs.readdirSync('./slashCommands').filter(file => file.endsWith('.js'));
const sendCommandLog = require('./utils/sendCommandLog');
const logCommands = require('./utils/logCommands');

// const { commandLogs } = require('./logStore'); 


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.prefixCommands = new Collection();
client.slashCommands = new Collection();
client.commands = new Map();

// Load prefix commands
const prefixCommandFiles = fs.readdirSync('./commands')
  .filter(category => fs.lstatSync(`./commands/${category}`).isDirectory())
  .flatMap(category => {
    return fs.readdirSync(`./commands/${category}`)
      .filter(file => file.endsWith('.js'))
      .map(file => `./commands/${category}/${file}`);
  });

for (const file of prefixCommandFiles) {
  const command = require(file);
  client.prefixCommands.set(command.name, command);
  if (command.aliases) {
    for (const alias of command.aliases) {
      client.prefixCommands.set(alias, command);
    }
  }
}

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    if (file.endsWith('.js') && fs.lstatSync(filePath).isFile()) {
        const command = require(filePath);
        if (command.name && typeof command.execute === 'function') {
            client.commands.set(command.name, command);
        }
    }
}

// Load handlers
client.handlers = {};
const handlersPath = path.join(__dirname, 'handlers');
const handlerFiles = fs.readdirSync(handlersPath).filter(file => file.endsWith('.js'));

for (const file of handlerFiles) {
  const handler = require(path.join(handlersPath, file));
  client.handlers[handler.name] = handler.execute;
}

// Load events
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Prefix command handler
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;


  const args = message.content.slice(prefix.length).trim().split(/ +/);
  let commandName = args.shift().toLowerCase();
  let command = client.prefixCommands.get(commandName);

  // دعم الأوامر المكونة من كلمتين مثل 'man add'
  if (!command && args.length > 0) {
    const twoWordCommand = `${commandName} ${args[0]}`;
    if (client.prefixCommands.has(twoWordCommand)) {
      commandName = twoWordCommand;
      command = client.prefixCommands.get(twoWordCommand);
      args.shift(); // إزالة الكلمة الثانية من args
    }
  }
  if (!command) return;

  try {
    await command.execute(message, args, client);
    // Log command execution in logs channel
    await sendCommandLog(message, commandName);
    // Log command to file using logCommands
    logCommands.logCommand(commandName, message.author.id, message.channel.id);
  } catch (error) {
    console.error(error);
    message.reply('There was an error executing that command.');
    // Log failed command attempt in logs channel
    await sendCommandLog(message, commandName, { error: error.message });
    // Log failed command to file as well
    logCommands.logCommand(commandName, message.author.id, message.channel.id, 'error', { error: error.message });
  }
});

// Slash commands loader
/*const slashCommandFiles = fs.readdirSync('./slashCommands').filter(file => file.endsWith('.js'));

for (const file of slashCommandFiles) {
  const command = require(`./slashCommands/${file}`);
  client.slashCommands.set(command.data.name, command);
}*/

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Registering slash commands...');
    const slashCommandsData = [];

    for (const file of slashCommandFiles) {
  const command = require(`./slashCommands/${file}`);
  client.slashCommands.set(command.data.name, command);
  slashCommandsData.push(command.data.toJSON()); // Ensure command is registered
}

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: slashCommandsData },
    );

    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
})();

// Slash command handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        await interaction.reply({ content: 'Unknown command.', flags: 64 });
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command.', flags: 64 });
    }
});

// MongoDB connection
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Login
client.login(token);

// Start leaderboard refresh when bot is ready
client.once('clientReady', () => {
  const leaderboardRefresh = require('./handlers/leaderboardRefresh');
  
  // Start leaderboard refresh for all guilds
  client.guilds.cache.forEach(guild => {
    leaderboardRefresh.startRefresh(guild.id, client);
  });
});
