import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from 'discord-api-types/v9'
import { SleetMessageCommand } from '../modules/context-menu/SleetMessageCommand.js'
import { SleetSlashCommand } from '../modules/slash/SleetSlashCommand.js'
import { SleetUserCommand } from '../modules/context-menu/SleetUserCommand.js'
import { SleetSlashCommandGroup } from '../modules/slash/SleetSlashSubcommandGroup.js'
import { SleetSlashSubcommand } from '../modules/slash/SleetSlashSubcommand.js'
import { inGuild } from '../guards/inGuild.js'
import { PreRunError } from '../errors/PreRunError.js'
import { hasPermissions } from '../guards/index.js'
import { getChannel, getMember } from '../parsers/resolvedData.js'
import { SleetModule } from '../modules/base/SleetModule.js'
import { Message } from 'discord.js'

export const readyLogModule = new SleetModule('ready-log', {
  load: () => {
    console.log(`${readyLogModule.name} loaded!`)
  },
  ready: (client) => {
    console.log(`Logged in as ${client.user.tag}`)
  },
  messageReactionAdd: (messageReaction, user) => {
    console.log(
      `${user.tag} reacted with ${messageReaction.emoji.name} to ${messageReaction.message.id}`,
    )
  },
})

export const slashCommand = new SleetSlashCommand(
  {
    name: 'slash-test',
    description: 'Echoes the message',
    options: [
      {
        name: 'message',
        type: ApplicationCommandOptionType.String,
        description: 'The message to echo',
        required: true,
      },
    ],
  },
  {
    run: (interaction) => {
      const message = interaction.options.getString('message', true)
      interaction.reply(message)
    },
  },
)

export const pingCommand = new SleetSlashCommand(
  {
    name: 'ping',
    description: 'Pong! Checks the bot latency',
  },
  {
    run: async function (interaction) {
      const reply = await interaction.reply({
        content: 'Ping?',
        fetchReply: true,
      })

      const message =
        reply instanceof Message
          ? reply
          : await interaction.channel?.messages.fetch(reply.id)

      if (!message) return interaction.reply('Could not fetch message')

      const wsPing = this.client.ws.ping
      const apiPing = message.createdTimestamp - interaction.createdTimestamp
      const content = `Pong! **WS**: ${wsPing}ms, **API**: ${apiPing}ms`
      interaction.editReply(content)
    },
  },
)

export const userCommand = new SleetUserCommand(
  {
    name: 'User Test',
    type: ApplicationCommandType.User,
  },
  {
    run: (interaction, user) => {
      return interaction.reply(user.username)
    },
  },
)

export const messageCommand = new SleetMessageCommand(
  {
    name: 'Message Test',
    type: ApplicationCommandType.Message,
  },
  {
    run: (interaction, message) => {
      return interaction.reply(message.content)
    },
  },
)

export const userGetCommand = new SleetSlashSubcommand(
  {
    name: 'get',
    description: 'Get permissions for a user',
    options: [
      {
        name: 'user',
        description: 'The user to get permissions for',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'channel',
        description:
          'The channel permissions to get (default: Guild permissions)',
        type: ApplicationCommandOptionType.Channel,
      },
    ],
  },
  {
    run: async (interaction) => {
      // Then individual commands can also have their own permission checking
      // and should respond to the interaction!!

      console.log('Running `/permissions user get` subcommand handler...')
      hasPermissions(interaction, ['MANAGE_ROLES'])
      await interaction.deferReply()

      const member = await getMember(interaction, 'user', true)
      const channel = await getChannel(interaction, 'channel')
      const permissions = channel
        ? member.permissionsIn(channel)
        : member.permissions

      const permString = permissions.toArray().join(', ')

      interaction.editReply(
        `In ${
          channel ? `${channel}` : 'this guild'
        }, ${member} has permissions:\n${permString}`,
      )
    },
  },
)

export const userEditCommand = new SleetSlashSubcommand(
  {
    name: 'edit',
    description: 'Edit permissions for a user',
    options: [
      {
        name: 'user',
        description: 'The user to edit permissions for',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'channel',
        description:
          'The channel to edit permissions for (default: Guild permissions)',
        type: ApplicationCommandOptionType.Channel,
      },
    ],
  },
  {
    run: async (interaction) => {
      // Then individual commands can also have their own permission checking
      // and should respond to the interaction!!
      console.log('Editing for user...')
      hasPermissions(interaction, ['MANAGE_ROLES'])
      interaction.reply('Imagine this actually edited permissions')
    },
  },
)

export const userGroup = new SleetSlashCommandGroup(
  {
    name: 'user',
    description: 'Get or edit permissions for a user',
    options: [userGetCommand, userEditCommand],
  },
  {
    run: (interaction) => {
      // You can run any checks or do any logging that runs before any subcommand execution here
      // Throw an error to prevent any further execution
      // Here we check that the user provided is in the guild

      const member = interaction.options.getMember('user')

      if (!member) {
        throw new PreRunError('That user is not in the guild!')
      }

      console.log('Running `/permissions user` subcommand group handler...')
    },
  },
)

export const userPermissionsCommand = new SleetSlashCommand(
  {
    name: 'permissions',
    description: 'Get or edit permissions for a user or role',
    options: [userGroup],
  },
  {
    run: (interaction) => {
      // You can run any checks or do any logging that runs before any subcommand groups are executed here
      // Throw an error to prevent any further execution
      // Here we call the `inGuild()` guard to stop executing this command if we aren't in a guild
      inGuild(interaction)
      console.log('Running base `/permissions` command handler...')
    },
  },
)
