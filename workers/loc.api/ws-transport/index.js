'use strict'

const uuid = require('uuid')
const { omit } = require('lib-js-util-base')
const { PeerRPCServer } = require('grenache-nodejs-ws')

const {
  BadRequestError
} = require('bfx-report/workers/loc.api/errors')

const { decorateInjectable } = require('../di/utils')

const depsTypes = (TYPES) => [
  TYPES.CONF,
  TYPES.RService,
  TYPES.DAO,
  TYPES.Link,
  TYPES.GRC_BFX_OPTS,
  TYPES.TABLES_NAMES,
  TYPES.Authenticator,
  TYPES.Responder
]
class WSTransport {
  constructor (
    { wsPort },
    rService,
    dao,
    link,
    grcBfxOpts,
    TABLES_NAMES,
    authenticator,
    responder
  ) {
    this.wsPort = wsPort
    this.rService = rService
    this.dao = dao
    this.link = link
    this.opts = { ...grcBfxOpts }
    this.TABLES_NAMES = TABLES_NAMES
    this.authenticator = authenticator
    this.responder = responder

    this._active = false
    this._sockets = new Map()
    this._auth = new Map()
  }

  _initPeer () {
    this.peer = new PeerRPCServer(this.link, {})

    this.peer.init()
  }

  _initTransport () {
    this.transport = this.peer.transport('server')

    this.transport.listen(this.wsPort)
  }

  _announceOne (
    key,
    resolve = () => {},
    reject = () => {}
  ) {
    this.link.announce(key, this.transport.port, {}, (err) => {
      if (err) {
        reject(err)

        console.error(err)
      }

      resolve()
    })
  }

  _announce () {
    const {
      services = [],
      tickInterval = 45000
    } = { ...this.opts }

    return services.reduce(async (accum, srv) => {
      await accum

      return new Promise((resolve, reject) => {
        const key = `${srv}:ws`

        this._announceItv = setInterval(() => {
          this._announceOne(key)
        }, tickInterval)

        this._announceOne(key, resolve, reject)
      })
    }, Promise.resolve())
  }

  _initRPC () {
    this.transport.on('request', (rid, key, payload, { reply }) => {
      const _payload = { ...payload }
      const { method = '' } = _payload
      const args = omit(_payload, ['method'])
      const _reply = (err, res) => {
        reply(err, {
          action: method,
          ...res
        })
      }

      if (method === 'signIn') {
        return
      }
      if (
        typeof this.rService[method] !== 'function' ||
        /^_/.test(method)
      ) {
        this.responder(
          () => new BadRequestError(),
          method,
          args,
          _reply
        )

        return
      }

      const fn = this.rService[method].bind(this.rService)

      fn(null, args, _reply)
    })
  }

  _listen () {
    this.transport.socket.on('connection', socket => {
      this._active = true
      socket.isAlive = true

      const sid = socket._grc_id = uuid.v4()

      this._sockets.set(sid, socket)

      socket.on('close', () => {
        this._auth.delete(sid)
        this._sockets.delete(sid)
      })
      socket.on('pong', () => {
        socket.isAlive = true
      })
      socket.on('message', async (strData) => {
        const data = this.transport.parse(strData)

        if (!Array.isArray(data)) {
          this.transport.emit('request-error')

          return
        }

        const rid = data[0]
        const payload = data[2]

        if (
          !payload ||
          typeof payload !== 'object' ||
          payload.method !== 'signIn' ||
          !payload.auth ||
          typeof payload.auth !== 'object'
        ) {
          return
        }

        this.responder(
          async () => {
            const user = await this.authenticator.signIn(
              { auth: payload.auth },
              { isReturnedUser: true, doNotQueueQuery: true }
            )
            const {
              email,
              isSubAccount,
              token
            } = { ...user }

            this._auth.set(sid, user)

            return {
              email,
              isSubAccount,
              token
            }
          },
          payload.method,
          payload,
          (err, res) => {
            this.transport.sendReply(socket, rid, err, {
              action: payload.method,
              ...res
            })
          }
        )
      })
    })

    const aliveStateInterval = setInterval(() => {
      this.transport.socket.clients.forEach((socket) => {
        if (!socket.isAlive) {
          socket.terminate()

          return
        }

        socket.isAlive = false

        if (!this._active) return

        socket.ping(null, false)
      })
    }, 20_000)

    this.transport.socket.on('close', () => {
      this._active = false

      clearInterval(aliveStateInterval)
    })
  }

  _getFreshUsersDataFromSessions () {
    return [...this.authenticator.getUserSessions()]
      .reduce((accum, curr) => {
        const session = curr[1]

        for (const [, user] of this._auth.entries()) {
          if (user._id !== session._id) {
            continue
          }

          accum.push(session)
        }

        return accum
      }, [])
  }

  _findUser (auth = {}, freshUsersDate = []) {
    const freshData = freshUsersDate.find(({ _id, email }) => (
      auth._id === _id &&
      auth.email === email
    ))

    return {
      ...auth,
      ...freshData
    }
  }

  _isActiveUser (user) {
    return (
      user &&
      typeof user === 'object' &&
      user.active
    )
  }

  _sendToOne (socket, action, err, result = null) {
    this.responder(
      () => {
        if (err) {
          throw err
        }

        return result
      },
      action,
      {},
      (err, res) => {
        const _res = this.transport.format(
          [null, err, { ...res, action }]
        )

        socket.send(_res)
      }
    )
  }

  async send (
    handler,
    action,
    args = {},
    opts = {}
  ) {
    if (
      !this._active ||
      this._auth.size === 0
    ) {
      return false
    }

    const {
      isReceivedFreshUserDataFromDb = false,
      isEmittedToActiveUsers = false
    } = { ...opts }

    const freshUsersDate = isReceivedFreshUserDataFromDb
      ? await this._getFreshUsersDataFromSessions()
      : false

    for (const [sid, socket] of this._sockets) {
      if (!this._auth.has(sid)) {
        continue
      }

      const auth = this._auth.get(sid)
      const user = isReceivedFreshUserDataFromDb
        ? this._findUser(auth, freshUsersDate)
        : auth

      try {
        if (
          handler === null ||
          (
            isEmittedToActiveUsers &&
            !this._isActiveUser(user)
          )
        ) {
          continue
        }

        const res = typeof handler === 'function'
          ? await handler(user, { ...args, action })
          : handler

        if (
          res &&
          typeof res === 'object' &&
          res.isNotEmitted
        ) {
          continue
        }

        this._sendToOne(socket, action, null, res)
      } catch (err) {
        this._sendToOne(socket, action, err)
      }
    }

    return true
  }

  sendToActiveUsers (
    handler,
    action,
    args = {}
  ) {
    return this.send(
      handler,
      action,
      args,
      {
        isReceivedFreshUserDataFromDb: true,
        isEmittedToActiveUsers: true
      }
    )
  }

  getAuth () {
    return this._auth
  }

  async isBfxApiMaintenanceModeOff () {
    try {
      const {
        isMaintenance
      } = await this.rService.getPlatformStatus()

      return !isMaintenance
    } catch (err) {
      return false
    }
  }

  async start () {
    this._initPeer()
    this._initTransport()
    this._listen()

    await this._announce()

    this._initRPC()
  }

  stop () {
    clearInterval(this._announceItv)

    if (this.peer) this.peer.stop()
    if (this.transport) this.transport.stop()
  }
}

decorateInjectable(WSTransport, depsTypes)

module.exports = WSTransport
