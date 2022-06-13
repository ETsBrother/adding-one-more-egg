import type {
  ApplicationCommandOptionData,
  ApplicationCommandSubCommandData,
  ApplicationCommandType,
} from 'discord.js'
import assert from 'node:assert'
import type { ChatCommandDef, MessageCommandDef, UserCommandDef } from '../types.js'
import { isChatCommand } from '../util.js'
import type { CommandContext, MessageCommandContext, UserCommandContext } from './context.js'

export type ChatCommand = Required<ChatCommandDef> & { type: 'CHAT_INPUT' }
export type UserCommand = Required<UserCommandDef> & { type: 'USER' }
export type MessageCommand = Required<MessageCommandDef> & { type: 'MESSAGE' }

export type Command = ChatCommand | UserCommand | MessageCommand

export enum CommandResult {
  /**
   * Denotes successful execution of the command. This includes user errors, such as a missing
   * option or bad value.
   */
  Success,
  /**
   * Denotes a failure to fulfill execution of the command. Typicall an error that is not caused by
   * the user, such as a failed request to an external API, logic error, etc.
   */
  Failure,
}

const normalizeOptions = (
  options: readonly ApplicationCommandOptionData[] | undefined
): ApplicationCommandOptionData[] | undefined => {
  if (options == null) {
    return undefined
  }

  const base: ApplicationCommandOptionData = {
    type: undefined as never,
    name: undefined as never,
    description: undefined as never,
    required: undefined,
    autocomplete: undefined,
    choices: undefined,
    channelTypes: undefined,
    minValue: undefined,
    maxValue: undefined,
    options: undefined,
  }

  return options.map((option) => {
    if (option.type === 'SUB_COMMAND_GROUP') {
      return {
        ...(base as object),
        ...option,
        type: option.type,
        options: normalizeOptions(option.options) as ApplicationCommandSubCommandData[],
      }
    }

    if (option.type === 'SUB_COMMAND') {
      return {
        ...(base as object),
        ...option,
        type: option.type,
        options: normalizeOptions(option.options) as ApplicationCommandSubCommandData['options'],
      }
    }

    return {
      ...(base as object),
      ...option,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      required: (option as any).required ?? false,
    }
  })
}

function command(type: 'CHAT_INPUT', def: ChatCommandDef): ChatCommand
function command(type: 'USER', def: UserCommandDef): UserCommand
function command(type: 'MESSAGE', def: MessageCommandDef): MessageCommand
function command(
  type: ApplicationCommandType,
  def: ChatCommandDef | UserCommandDef | MessageCommandDef
): Command {
  const commandObj: Command = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(def as any),
    options: isChatCommand(def) ? normalizeOptions(def.options) : undefined,
    type: type as never,
    guildOnly: (def.guildOnly ?? false) as never,
    logUsage: def.logUsage ?? false,
    userPermissions: def.userPermissions ?? [],
    botPermissions: def.botPermissions ?? [],
    autocomplete: (isChatCommand(def) ? def.autocomplete : null) as never,
  }

  if (commandObj.logUsage) {
    commandObj.run = (async (
      context: CommandContext & UserCommandContext & MessageCommandContext
    ) => {
      const { interaction } = context

      assert(interaction.isCommand())

      // TODO log usage

      return await def.run(
        // @ts-expect-error guild types are not correct
        context
      )
    }) as Command['run']
  }

  return commandObj
}

export default command
