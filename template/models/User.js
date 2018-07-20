const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const JWT_SECRET = 'teddybear'

module.exports = schema => {
  // ===
  // Define new model
  // ===
  const User = schema.define('User', {
    name: { type: schema.String, limit: 32 },
    email: { type: schema.String, limit: 155, unique: true },
    password: { type: schema.String, limit: 255 },
    joinedAt: { type: schema.Date, default: Date.now },
  })

  // ===
  // Export ready function
  // All functions called on model should be inside that function
  // ===
  return function ready () {
    // ===
    // Add validators
    // ===

    // Validate existance of login, email and password
    User.validatesPresenceOf('name', 'email', 'password')

    // Validate uniqueness of email
    User.validatesUniquenessOf('email', {
      message: 'This email is already in use',
    })

    // Validate length of password
    User.validatesLengthOf('password', {
      min: 5,
      max: 255,
      message: {
        min: 'Password is too short',
        max: 'Password is too long',
      },
    })

    // ===
    // Add methods
    // ===

    // Find user by login/email
    User.findByLogin = async function (login) {
      return new Promise((resolve, reject) => {
        User.findOne({
          where: { name: login },
        }, (err, user) => {
          if (err) {
            return reject(err)
          }

          if (!user) {
            return User.findOne({
              where: { email: login },
            }, (err, user) => {
              if (err) {
                return reject(err)
              }

              resolve(user)
            })
          }

          resolve(user)
        })
      })
    }

    // Authenticate user by login and password
    User.authenticate = async function (login, password) {
      const user = await User.findByLogin(login)
      if (!user) return false

      return user.authenticate(password)
    }

    // Authenticate user instance
    User.prototype.authenticate = function (password) {
      const password_matches = bcrypt.compare(password, this.password)

      if (!password_matches) return false

      return jwt.sign({
        exp: Math.floor(Date.now() / 1000) + 3600 * 24,
        username: this.name,
      }, JWT_SECRET)
    }

    // Verify user token
    User.verify = async function (token) {
      return User.findByLogin(jwt.verify(token, JWT_SECRET).username)
    }

    // ===
    // Add events
    // ===

    // Hash password just before creating new user
    User.beforeCreate = function (next) {
      bcrypt.hash(this.password, 10).then(hash => {
        this.password = hash
        next()
      })
    }

    // ===
    // Export to global scope
    // ===
    return User
  }
}
