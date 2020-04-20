'use strict'

const uuid = require('uuid')
const { omit } = require('lodash')
const { PeerRPCServer } = require('grenache-nodejs-ws')
const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../di/types')

const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')

class WSTransport {
  constructor (
    { wsPort },
    rService,
    dao,
    link,
    grcBfxOpts,
    TABLES_NAMES,
    authenticator
  ) {
    this.wsPort = wsPort
    this.rService = rService
    this.dao = dao
    this.link = link
    this.opts = { ...grcBfxOpts }
    this.TABLES_NAMES = TABLES_NAMES
    this.authenticator = authenticator

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

      if (method === 'signIn') {
        return
      }
      if (
        typeof this.rService[method] !== 'function' ||
        /^_/.test(method)
      ) {
        reply(new FindMethodError())

        return
      }

      const fn = this.rService[method].bind(this.rService)

      fn(null, args, reply)
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

        try {
          if (
            !payload ||
            typeof payload !== 'object' ||
            payload.method !== 'signIn' ||
            !payload.auth ||
            typeof payload.auth !== 'object'
          ) {
            return
          }

          // TODO:
          // const user = await this.rService.login(
          //   null,
          //   { auth: payload.auth },
          //   null,
          //   true
          // )
          const user = await this.authenticator.signIn(
            { auth: payload.auth },
            { isReturnedUser: true }
          )
          const {
            email,
            isSubAccount,
            jwt
          } = { ...user }

          this._auth.set(sid, user)
          this.transport.sendReply(socket, rid, null, {
            email,
            isSubAccount,
            jwt
          })
        } catch (err) {
          this.transport.sendReply(socket, rid, err)
        }
      })
    })

    const aliveStateInterval = setInterval(() => {
      this.transport.socket.clients.forEach((socket) => {
        if (!socket.isAlive) {
          socket.terminate()

          return
        }

        socket.isAlive = false
        socket.ping(null, false)
      })
    }, 10000)

    this.transport.socket.on('close', () => {
      this._active = false

      clearInterval(aliveStateInterval)
    })
  }

  _getFreshUsersDataFromDb () {
    const usersIds = [...this._auth].map(([sid, user]) => user._id)

    return this.authenticator.getUsers(
      { $in: { _id: usersIds } }
    )
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

  _sendToOne (socket, sid, action, err, result = null) {
    const res = this.transport.format(
      [sid, err ? err.message : null, { action, result }]
    )

    socket.send(res)
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
      ? await this._getFreshUsersDataFromDb()
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
          (
            typeof handler !== 'function' &&
            handler === null
          ) ||
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

        this._sendToOne(socket, sid, action, null, res)
      } catch (err) {
        this._sendToOne(socket, sid, action, err)
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

decorate(injectable(), WSTransport)
decorate(inject(TYPES.CONF), WSTransport, 0)
decorate(inject(TYPES.RService), WSTransport, 1)
decorate(inject(TYPES.DAO), WSTransport, 2)
decorate(inject(TYPES.Link), WSTransport, 3)
decorate(inject(TYPES.GRC_BFX_OPTS), WSTransport, 4)
decorate(inject(TYPES.TABLES_NAMES), WSTransport, 5)
decorate(inject(TYPES.Authenticator), WSTransport, 6)

module.exports = WSTransport
