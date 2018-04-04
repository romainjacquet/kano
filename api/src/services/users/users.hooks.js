import { iffElse, iff } from 'feathers-hooks-common'
import { hooks as coreHooks } from 'kCore'
import { hooks as teamHooks } from 'kTeam'
import { hooks as notifyHooks } from 'kNotify'

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [ notifyHooks.addVerification ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      iff(hook => !hook.result.sponsor, notifyHooks.sendVerificationEmail),
      notifyHooks.removeVerification,
      iffElse(hook => hook.result.sponsor, teamHooks.joinOrganisation, teamHooks.createPrivateOrganisation)
    ],
    update: [],
    patch: [],
    remove: [
      coreHooks.setAsDeleted,
      coreHooks.updateTags,
      // Avoid removing subscriptions on removed (ie unused) tags
      notifyHooks.updateSubjectSubscriptions({
        field: 'tags',
        service: 'tags',
        filter: (operation, topics) => operation === 'unsubscribe' ? topics.filter(topic => topic.count > 1) : topics,
        subjectAsItem: true
      }),
      iff(hook => !hook.result.sponsor, teamHooks.removePrivateOrganisation),
      teamHooks.leaveOrganisations(),
      notifyHooks.unregisterDevices
    ]
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
}
