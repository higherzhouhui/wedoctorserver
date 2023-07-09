const UTIL = {
  sendTypeFormat: (req, res, msg, code, data) => {
    res.send({msg: msg, code: code, data})
    console.log(`${new Date()}-${req.url}:  ${msg}`)
  },
}

module.exports = UTIL