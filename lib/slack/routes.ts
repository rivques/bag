import views from './views'
import { mappedPermissionValues } from '../permissions'
import { PrismaClient, PermissionLevels, Instance } from '@prisma/client'
import { log } from '../logger'
import { v4 as uuid } from 'uuid'
import { getKeyByValue, channels, combineInventory } from '../utils'
import slack, { execute } from './slack'

const prisma = new PrismaClient()

slack.command('/bag-item', async props => {
  await execute(props, async (props, permission) => {
    const message = props.command.text
    const command = message.split(' ')[0]

    const user = await prisma.identity.findUnique({
      where: {
        slack: props.context.userId
      }
    })

    switch (command) {
      case 'list':
        let items = await prisma.item.findMany()
        if (permission < mappedPermissionValues.READ_PRIVATE)
          items = items.filter(item => item.public)
        else if (permission < mappedPermissionValues.WRITE)
          items = items.filter(
            item =>
              item.public ||
              user.specificItems.find(itemId => itemId === item.name)
          )
        const formatted = items.map(item => views.getItem(item))
        return await props.client.chat.postMessage({
          channel: props.body.channel_id,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Here's a list of all the ${
                  permission < mappedPermissionValues.READ_PRIVATE
                    ? 'public '
                    : ''
                }items currently in the bag:`
              }
            },
            ...formatted.map(itemBlock => itemBlock[0]),
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: "If you'd like to snap your fingers like Thanos and suggest an item to be added to the bag, you can run `/bag-item create`!"
              }
            }
          ]
        })
      case 'search':
        try {
          const query = message.split(' ').slice(1).join('')
          if (query[0] !== '`' || query[query.length - 1] !== '`')
            throw new Error()
          let items = await prisma.item.findMany({
            where: JSON.parse(query.slice(1, query.length - 1))
          })
          if (!items.length) throw new Error()

          if (
            mappedPermissionValues[user.permissions] <
            mappedPermissionValues.READ_PRIVATE
          )
            items = items.filter(item => item.public)
          if (
            mappedPermissionValues[user.permissions] <
            mappedPermissionValues.WRITE
          )
            items = items.filter(
              item =>
                item.public ||
                user.specificItems.find(itemId => itemId === item.name)
            )

          const formatted = items.map(item => views.getItem(item))
          return await props.client.chat.postMessage({
            channel: props.body.channel_id,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `Here's a list of all the items in the bag that match ${query}:`
                }
              },
              ...formatted.map(itemBlock => itemBlock[0])
            ]
          })
        } catch {
          return await props.client.chat.postEphemeral({
            channel: props.body.channel_id,
            user: props.context.userId,
            text: "Oh no! Couldn't find any items matching your query. Make sure your query is properly formatted - that is, a valid JSON query encased in a `code snippet`."
          })
        }
      case 'edit':
        try {
          const name = message.split(' ')[1]
          const item = await prisma.item.findUnique({
            where: {
              name
            }
          })

          if (!item) throw new Error()
          if (
            mappedPermissionValues[user.permissions] <
            mappedPermissionValues.WRITE_SPECIFIC
          )
            throw new Error()
          if (
            user.permissions === PermissionLevels.WRITE_SPECIFIC &&
            !user.specificItems.find(itemId => itemId === item.name)
          )
            throw new Error()

          await props.client.views.open({
            trigger_id: props.body.trigger_id,
            view: views.editItem(item)
          })
        } catch {
          return await props.client.chat.postEphemeral({
            channel: props.body.channel_id,
            user: props.context.userId,
            text: "Oh no! To edit an item you'll need to provide the name of the item and have the appropriate permissions."
          })
        }
        break
      case 'create':
        // If admin, form directly creates item; otherwise, it opens a request to maintainers
        return await props.client.views.open({
          trigger_id: props.body.trigger_id,
          view: views.createItem
        })
      default:
        // Either list item, or if no message is provided, show options
        if (message === '') {
          // List options
          return await props.client.chat.postEphemeral({
            channel: props.body.channel_id,
            user: props.context.userId,
            blocks: views.itemDialog
          })
        } else {
          try {
            const item = await prisma.item.findUnique({
              where: {
                name: props.command.text
              }
            })

            if (!item) throw new Error()
            if (user.permissions === PermissionLevels.READ && !item.public)
              throw new Error()
            if (
              mappedPermissionValues[user.permissions] <
                mappedPermissionValues.WRITE &&
              !item.public &&
              !user.specificItems.find(itemId => itemId === item.name)
            )
              throw new Error()

            return await props.client.chat.postMessage({
              channel: props.body.channel_id,
              user: props.context.userId,
              blocks: views.getItem(item)
            })
          } catch {
            return await props.client.chat.postEphemeral({
              channel: props.body.channel_id,
              user: props.context.userId,
              text: `Oops, couldn't find a item named *${message}*.`
            })
          }
        }
    }
  })
})

// TODO: Should allow existing items to give permissions to new apps

slack.view('edit-item', async props => {
  await execute(props, async props => {
    let fields: {
      name: string
      image: string
      description: string
      reaction: string
      commodity: boolean
      tradable: boolean
      public: boolean
    } = {
      name: undefined,
      image: undefined,
      description: undefined,
      reaction: undefined,
      commodity: undefined,
      tradable: undefined,
      public: undefined
    }
    for (let field of Object.values(props.view.state.values)) {
      if (field[Object.keys(field)[0]].value === null) continue
      fields[Object.keys(field)[0]] =
        field[Object.keys(field)[0]].value ||
        Object.values(field)[0].selected_option.value ||
        ''
      if (fields[Object.keys(field)[0]] === 'true')
        fields[Object.keys(field)[0]] = true
      else if (fields[Object.keys(field)[0]] === 'false')
        fields[Object.keys(field)[0]] = false
    }

    const { prevName } = JSON.parse(props.view.private_metadata)

    const item = await prisma.item.update({
      where: {
        name: prevName
      },
      data: fields
    })

    await props.client.chat.postMessage({
      channel: props.context.userId,
      user: props.context.userId,
      text: `Updated *${item.name}* successfully.`
    })
  })
})

slack.view('create-item', async props => {
  await execute(
    props,
    async props => {
      let fields: {
        name: string
        reaction: string
        description: string
        commodity: boolean
        tradable: boolean
        public: boolean
      } = {
        name: undefined,
        reaction: undefined,
        description: undefined,
        commodity: undefined,
        tradable: undefined,
        public: undefined
      }
      for (let field of Object.values(props.view.state.values)) {
        fields[Object.keys(field)[0]] =
          field[Object.keys(field)[0]].value ||
          Object.values(field)[0].selected_option.value ||
          ''
        if (fields[Object.keys(field)[0]] === 'true')
          fields[Object.keys(field)[0]] = true
        else if (fields[Object.keys(field)[0]] === 'false')
          fields[Object.keys(field)[0]] = false
      }

      const user = await prisma.identity.findUnique({
        where: {
          slack: props.context.userId
        }
      })
      if (user.permissions !== PermissionLevels.ADMIN) {
        // Request to create item
        await props.client.chat.postMessage({
          channel: user.slack,
          text: 'Item creation request made! You should get a response sometime in the next 24 hours if today is a weekday, and 72 hours otherwise!'
        })
        return await props.client.chat.postMessage({
          channel: channels.approvals,
          blocks: views.approveOrDenyItem(fields, props.context.userId)
        })
      }

      // Create item
      const item = await prisma.item.create({
        data: fields
      })
      log('New item created: ', item.name)
      await props.client.chat.postMessage({
        channel: props.context.userId,
        user: props.context.userId,
        text: `New item created: ${item.name} ${item.reaction}`
      })
    },
    mappedPermissionValues.ADMIN
  )
})

slack.action('approve-item', async props => {
  await execute(props, async props => {
    try {
      // @ts-expect-error
      let { user, item: fields } = JSON.parse(props.action.value)

      // Create item, and add to user's list of items they can access
      const item = await prisma.item.create({
        data: fields
      })
      log('New item created: ', item.name)

      await prisma.identity.update({
        where: {
          slack: user
        },
        data: {
          specificItems: { push: item.name }
        }
      })

      // @ts-expect-error
      await props.client.chat.postMessage({
        channel: user,
        user,
        text: `New item approved and created: ${item.name} ${item.reaction}`
      })
    } catch {
      await props.say('Already applied.')
    }
  })
})

slack.action('deny-item', async props => {
  await execute(props, async props => {
    try {
      // @ts-expect-error
      let { user, item } = JSON.parse(props.action.value)

      // @ts-expect-error
      await props.client.chat.postMessage({
        channel: user,
        text: `Your request to create ${item.name} ${item.reaction} was denied.`
      })
    } catch {
      return await props.say('Already applied.')
    }
  })
})

slack.command('/bag-app', async props => {
  await execute(props, async (props, permission) => {
    const message = props.command.text
    const command = message.split(' ')[0]

    const user = await prisma.identity.findUnique({
      where: {
        slack: props.context.userId
      }
    })

    switch (command) {
      case 'list':
        let apps = await prisma.app.findMany()
        if (permission < mappedPermissionValues.READ_PRIVATE)
          apps = apps.filter(app => app.public)
        let formatted = apps.map(app => views.getApp(app))
        return await props.client.chat.postMessage({
          channel: props.body.channel_id,
          user: props.context.userId,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Here's a list of all the ${
                  permission < mappedPermissionValues.READ_PRIVATE
                    ? 'public '
                    : ''
                }apps currently in the bag:`
              }
            },
            ...formatted.map(appBlock => appBlock[0]),
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'You can write your own! Start by running `/create-app`.'
              }
            }
          ]
        })
      case 'search':
        try {
          const query = message.split(' ').slice(1).join('')
          if (query[0] !== '`' || query[query.length - 1] !== '`')
            throw new Error()
          let apps = await prisma.app.findMany({
            where: JSON.parse(query.slice(1, query.length - 1))
          })
          if (!apps.length) throw new Error()

          if (
            mappedPermissionValues[user.permissions] <
            mappedPermissionValues.READ_PRIVATE
          )
            apps = apps.filter(app => app.public)
          if (
            mappedPermissionValues[user.permissions] <
            mappedPermissionValues.ADMIN
          )
            apps = apps.filter(
              app =>
                app.public || app.specificApps.find(appId => appId === app.id)
            )

          const formatted = apps.map(app => views.getApp(app))
          return await props.client.chat.postMessage({
            channel: props.body.channel_id,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `Here's a list of all the apps in the bag that match ${query}:`
                }
              },
              ...formatted.map(appBlock => appBlock[0])
            ]
          })
        } catch {}
      case 'edit':
        try {
          const [id, key] = props.body.text.split(' ')
          if (Number.isNaN(Number(id)))
            return await props.client.chat.postEphemeral({
              channel: props.body.channel_id,
              user: props.context.userId,
              text: 'Oh no! Looks like you provided an invalid ID for the app.'
            })
          const app = await prisma.app.findUnique({
            where: {
              id: Number(id),
              AND: [{ key }]
            }
          })

          if (!app)
            return await props.client.chat.postEphemeral({
              channel: props.body.channel_id,
              user: props.context.userId,
              text: 'Oh no! App not found, or an incorrect key was used.'
            })

          return await props.client.views.open({
            trigger_id: props.body.trigger_id,
            view: views.editApp(app)
          })
        } catch {
          return await props.client.chat.postEphemeral({
            channel: props.body.channel_id,
            user: props.context.userId,
            text: "Oh no! To edit an app you'll need to provide an ID and key"
          })
        }
      case 'create':
        return await props.client.views.open({
          trigger_id: props.body.trigger_id,
          view: views.createApp(user.permissions)
        })
      default:
        if (message === '') {
          return await props.client.chat.postMessage({
            channel: props.body.channel_id,
            user: props.context.userId,
            blocks: views.appDialog
          })
        } else {
          try {
            const app = await prisma.app.findUnique({
              where: {
                name: message
              }
            })

            if (!app) throw new Error()
            if (user.permissions === PermissionLevels.READ && !app.public)
              throw new Error()
            if (
              mappedPermissionValues[user.permissions] <
                mappedPermissionValues.ADMIN &&
              !app.public &&
              !user.specificApps.find(appId => appId === app.id)
            )
              throw new Error()

            return await slack.client.chat.postMessage({
              channel: props.body.channel_id,
              user: props.context.userId,
              blocks: views.getApp(app)
            })
          } catch {
            return await slack.client.chat.postEphemeral({
              channel: props.body.channel_id,
              user: props.context.userId,
              text: `Oops, couldn't find an app named *${props.command.text}*.`
            })
          }
        }
    }
  })
})

// TODO: Should allow existing apps to give permissions to new apps

slack.view('create-app', async props => {
  await execute(props, async props => {
    let fields: {
      name: string
      description: string
      permissions: PermissionLevels
    } = {
      name: '',
      description: '',
      permissions: undefined
    }
    for (let field of Object.values(props.view.state.values))
      fields[Object.keys(field)[0]] =
        field[Object.keys(field)[0]].value ||
        Object.values(field)[0].selected_option.value ||
        ''

    // Apps, by default, can read everything that's public
    // But, if they're created by an admin, you can pass in any option
    const userId = props.context.userId

    // Make sure app doesn't exist yet
    if (
      await prisma.app.findUnique({
        where: {
          name: fields.name
        }
      })
    )
      throw new Error('Name is already being used')

    // Create app
    try {
      const app = await prisma.app.create({
        data: {
          name: fields.name,
          key: uuid(),
          description: fields.description,
          permissions: fields.permissions
        }
      })
      return await props.client.chat.postMessage({
        channel: userId,
        blocks: views.createdApp(app)
      })
    } catch (err) {
      return await props.client.chat.postMessage({
        channel: userId,
        blocks: views.error(
          `Oops, there was an error trying to deploy your app:
\`\`\`${err.toString()}.
\`\`\`
Try again?`
        )
      })
    }
  })
})

slack.view('edit-app', async props => {
  await execute(props, async props => {
    let fields: {
      'name': string
      'description': string
      'public': boolean
      'permissions': PermissionLevels
      'delete-app': string
    } = {
      'name': '',
      'description': '',
      'public': false,
      'permissions': undefined,
      'delete-app': undefined
    }
    for (let field of Object.values(props.view.state.values)) {
      if (field[Object.keys(field)[0]].value === null) continue
      fields[Object.keys(field)[0]] =
        field[Object.keys(field)[0]].value ||
        Object.values(field)[0].selected_option.value ||
        ''
      if (fields[Object.keys(field)[0]] === 'true')
        fields[Object.keys(field)[0]] = true
      else if (fields[Object.keys(field)[0]] === 'false')
        fields[Object.keys(field)[0]] = false
    }

    const { prevName } = JSON.parse(props.view.private_metadata)

    if (fields['delete-app']) {
      // Send user notification that their app was deleted
      let app = await prisma.app.findUnique({
        where: {
          name: prevName,
          key: fields['delete-app']
        }
      })
      if (!app)
        return await props.client.chat.postEphemeral({
          channel: props.context.userId,
          user: props.context.userId,
          text: `Unable to delete *${app.name}* - you provided the wrong key.`
        })
      await prisma.app.delete({
        where: {
          name: prevName,
          key: fields['delete-app']
        }
      })
      return await props.client.chat.postMessage({
        channel: props.context.userId,
        user: props.context.userId,
        text: `Deleted *${app.name}*.`
      })
    }

    let app = await prisma.app.findUnique({
      where: {
        name: prevName
      }
    })

    // Request permissions if changed
    if (
      mappedPermissionValues[app.permissions] >
      mappedPermissionValues[fields.permissions]
    ) {
      // Give downgrade without permissions
      await prisma.app.update({
        where: {
          name: prevName
        },
        data: {
          permissions: fields.permissions
        }
      })
    } else if (app.permissions !== fields.permissions) {
      await props.client.chat.postMessage({
        channel: channels.approvals,
        blocks: views.approveOrDenyAppPerms(
          app,
          fields.permissions as PermissionLevels
        )
      })
    }

    delete fields.permissions
    app = await prisma.app.update({
      where: {
        name: prevName
      },
      data: fields
    })
    await props.client.chat.postMessage({
      channel: props.context.userId,
      user: props.context.userId,
      text: `Updated *${app.name}* successfully.`
    })
  })
})

slack.command('/bag-request-perms', async props => {
  await execute(props, async props => {
    // Let user request permissions
    const user = await prisma.identity.findUnique({
      where: {
        slack: props.context.userId
      }
    })
    return await props.client.views.open({
      trigger_id: props.body.trigger_id,
      view: views.requestPerms(user)
    })
  })
})

slack.view('user-request-perms', async props => {
  await execute(props, async props => {
    let permissions = Object.values(props.view.state.values)[0].permissions
      .selected_option.value
    await props.client.chat.postMessage({
      channel: channels.approvals,
      blocks: views.approveOrDenyPerms(
        props.context.userId,
        permissions as PermissionLevels
      )
    })
    await props.client.chat.postMessage({
      channel: props.context.userId,
      user: props.context.userId,
      text: 'Permission request made! You should get a response sometime in the next 24 hours if today is a weekday, and 72 hours otherwise!'
    })
  })
})

slack.action('user-approve-perms', async props => {
  await execute(props, async props => {
    try {
      // @ts-expect-error
      let { user: userId, permissions } = JSON.parse(props.action.value)
      permissions = getKeyByValue(mappedPermissionValues, permissions)

      // Approve user
      await prisma.identity.update({
        where: {
          slack: userId
        },
        data: {
          permissions: permissions as PermissionLevels
        }
      })
      await props.say(
        `${
          permissions[0].toUpperCase() + permissions.slice(1)
        } for <@${userId}> approved.`
      )

      // Let user know
      // @ts-expect-error
      await props.client.chat.postMessage({
        channel: userId,
        text: `Your request for ${
          permissions[0].toUpperCase() + permissions.slice(1)
        } permissions was approved!`
      })
    } catch {
      return await props.say('Permissions already applied.')
    }
  })
})

slack.action('user-deny-perms', async props => {
  await execute(props, async props => {
    try {
      // Let user know
      // @ts-expect-error
      let { user: userId, permissions } = JSON.parse(props.action.value)
      permissions = getKeyByValue(mappedPermissionValues, permissions)

      // @ts-expect-error
      await props.client.chat.postMessage({
        channel: userId,
        text: `Your request for ${permissions} permissions was rejected.`
      })
    } catch {
      return await props.say('Permissions already applied.')
    }
  })
})

slack.command('/bag-trade', async props => {
  await execute(props, async props => {
    if (!/^<@[A-Z0-9]+\|[\d\w\s]+>$/gm.test(props.command.text))
      return await props.client.chat.postEphemeral({
        channel: props.body.channel_id,
        user: props.context.userId,
        text: 'Oh no! You need to mention a user in order to start a trade with them.'
      })

    const receiver = props.command.text.slice(
      2,
      props.command.text.indexOf('|')
    )

    // Create trade
    const trade = await prisma.trade.create({
      data: {
        initiatorIdentityId: props.context.userId,
        receiverIdentityId: receiver
      }
    })

    const { channel, ts } = await props.client.chat.postMessage({
      channel: props.body.channel_id,
      blocks: views.startTrade(props.context.userId, receiver, trade)
    })

    await props.client.chat.update({
      channel,
      ts,
      blocks: views.startTrade(props.context.userId, receiver, trade, {
        channel,
        ts
      })
    })
  })
})

slack.action('update-trade', async props => {
  await execute(props, async props => {
    // @ts-expect-error
    const { id, channel, ts } = JSON.parse(props.action.value)
    const trade = await prisma.trade.findUnique({
      where: {
        id: Number(id)
      }
    })

    if (
      ![trade.initiatorIdentityId, trade.receiverIdentityId].includes(
        props.body.user.id
      )
    )
      return props.say(
        "Oh no! You'll allowed to spectate on the trade and that's it."
      )

    // @ts-expect-error
    await props.client.views.open({
      // @ts-expect-error
      trigger_id: props.body.trigger_id,
      view: await views.tradeDialog(
        await prisma.identity.findUnique({
          where: {
            slack: props.body.user.id
          },
          include: {
            inventory: true
          }
        }),
        trade.id,
        { channel, ts }
      )
    })
  })
})

slack.view('add-trade', async props => {
  await execute(props, async props => {
    const user = await prisma.identity.findUnique({
      where: {
        slack: props.body.user.id
      },
      include: {
        inventory: true
      }
    })

    let fields: {
      item: string
      quantity: number
    } = {
      item: undefined,
      quantity: undefined
    }
    for (let field of Object.values(props.view.state.values))
      fields[Object.keys(field)[0]] =
        field[Object.keys(field)[0]].value ||
        Object.values(field)[0].selected_option.value ||
        ''

    const {
      trade: tradeId,
      channel,
      ts
    } = JSON.parse(props.view.private_metadata)

    const inventory = await combineInventory(user.inventory)
    const [quantity, instances, item] = inventory.find(
      ([_, __, item]) => item.name === fields.item
    )

    // Make sure quantity is not greater than the actual amount
    if (fields.quantity > quantity)
      return props.client.chat.postMessage({
        channel: props.context.userId,
        user: props.context.userId,
        text: `Woah woah woah! It doesn't look like you have ${fields.quantity} ${item.reaction} ${item.name} to trade.`
      })

    // Add to trade by creating instance
    const trade = await prisma.trade.findUnique({
      where: {
        id: tradeId
      }
    })
    const tradeKey =
      user.slack === trade.initiatorIdentityId
        ? 'initiatorTrades'
        : 'recieverTrades'

    // Calculate what instances need to be applied
    let i = 0
    for (let instance of instances) {
      if (i + instance.quantity >= fields.quantity) {
        // Stop here
        await prisma.tradeInstance.create({
          data: {
            instanceId: instance.id,
            quantity: fields.quantity - i,
            [tradeKey]: { connect: trade }
          }
        })
        break
      }
      i += instance.quantity
      await prisma.tradeInstance.create({
        data: {
          instanceId: instance.id,
          quantity: instance.quantity,
          [tradeKey]: { connect: trade }
        }
      })
    }

    // Post in thread about trade
    await props.client.chat.postMessage({
      channel,
      thread_ts: ts,
      blocks: views.addTrade(user, fields.quantity, item)
    })
  })
})

slack.action('close-trade', async props => {
  await execute(props, async props => {
    // Close trade, transfer items between users
    // @ts-expect-error
    let { id, channel, ts } = JSON.parse(props.action.value)
    id = Number(id)
    let trade = await prisma.trade.findUnique({
      where: {
        id
      }
    })

    if (
      ![trade.initiatorIdentityId, trade.receiverIdentityId].includes(
        props.body.user.id
      )
    )
      return await props.say("Oh no! You can't close this trade.")

    const tradeKey =
      props.body.user.id === trade.initiatorIdentityId
        ? 'initiatorAgreed'
        : 'receiverAgreed'
    trade = await prisma.trade.update({
      where: {
        id
      },
      data: {
        [tradeKey]: true
      }
    })

    // Make sure both sides have agreed
    if (!trade.initiatorAgreed || !trade.receiverAgreed)
      return props.say({
        thread_ts: ts,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `<@${props.body.user.id}> closed the trade! Waiting for both sides to close before transferring items.`
            }
          }
        ]
      })

    // If both sides have agreed, close the trade
    const closed = await prisma.trade.update({
      where: { id },
      data: { closed: true },
      include: {
        initiatorTrades: true,
        receiverTrades: true
      }
    })

    const initiator = await prisma.identity.findUnique({
      where: {
        slack: trade.initiatorIdentityId
      },
      include: {
        inventory: true
      }
    })
    const receiver = await prisma.identity.findUnique({
      where: {
        slack: trade.receiverIdentityId
      },
      include: {
        inventory: true
      }
    })

    // Now transfer items

    // @ts-expect-error
    await props.client.chat.postMessage({
      channel: closed.initiatorIdentityId,
      user: closed.initiatorIdentityId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Trade with <@${closed.receiverIdentityId}> closed!`
          }
        }
      ]
    })
    // @ts-expect-error
    await props.client.chat.postMessage({
      channel: closed.receiverIdentityId,
      user: closed.receiverIdentityId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Trade with <@${closed.initiatorIdentityId}> closed!`
          }
        }
      ]
    })
  })
})
