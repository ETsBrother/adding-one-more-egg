import { getTimeZones, timeZonesNames } from '@vvo/tzdb'
import _ from 'lodash'
import assert from 'node:assert'
import { matchString } from '../../util.js'
import command, { CommandResult } from '../command.js'
import { CommandContext } from '../context.js'
import { TIME_EPOCH } from './_time/epoch.js'
import TIME_IN from './_time/in.js'
import TIME_WORLD from './_time/world.js'
import TIME_ZONEINFO from './_time/zoneinfo.js'

const timezones = getTimeZones()
const regions = _.uniq(timezones.flatMap((tz) => [tz.continentName, tz.continentCode]))

export type TimeHandler = (context: CommandContext) => Promise<CommandResult>
const TIME_HANDLERS: { [key: string]: TimeHandler } = {
  world: TIME_WORLD,
  zoneinfo: TIME_ZONEINFO,
  in: TIME_IN,
  epoch: TIME_EPOCH,
}

const timeZoneInputs = _.uniq([
  ...timeZonesNames,
  ...timezones.flatMap((tz) => [tz.abbreviation, tz.alternativeName, ...tz.mainCities]),
])

const COMMAND_TIME = command('CHAT_INPUT', {
  name: 'time',
  description: 'Show info about times and time zones around the world.',
  options: [
    {
      name: 'epoch',
      description: 'Show epoch time',
      type: 'SUB_COMMAND',
    },
    {
      name: 'world',
      description: 'Show times in common time zones around the world.',
      type: 'SUB_COMMAND',
      options: [
        {
          name: 'region',
          description: 'Show times in a specific region.',
          type: 'STRING',
          autocomplete: true,
        },
      ],
    },
    {
      name: 'zoneinfo',
      description: 'Show info about a specific time zone.',
      type: 'SUB_COMMAND',
      options: [
        {
          name: 'zone',
          description: 'The time zone to show info about.',
          type: 'STRING',
          autocomplete: true,
        },
      ],
    },
    {
      name: 'in',
      description: 'Show the time in a specific time zone.',
      type: 'SUB_COMMAND',
      options: [
        {
          name: 'zone',
          description: 'The time zone to show the time in.',
          type: 'STRING',
          autocomplete: true,
          required: true,
        },
      ],
    },
  ],

  async autocomplete(interaction) {
    const option = interaction.options.getFocused(true)
    const input = option.value.toString()

    if (option.name === 'zone') {
      return matchString(input, timeZoneInputs)
    }

    if (option.name === 'region') {
      return matchString(input, regions)
    }

    return []
  },

  async run(context) {
    const { interaction } = context

    const handler = TIME_HANDLERS[interaction.options.getSubcommand(true)]

    assert(handler, `Missing handler for /time subcommand ${interaction.options.getSubcommand()}`)

    return await handler(context)
  },
})

export default COMMAND_TIME