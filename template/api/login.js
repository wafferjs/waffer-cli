module.exports = async (req) => {
  if (req.method !== 'POST') {
    return { status: 405 }
  }

  if (req.body.login && req.body.password) {
    const token = await User.authenticate(req.body.login, req.body.password)
    return !token ? { status: 401 } : { token }
  }

  return { status: 400 }
}
