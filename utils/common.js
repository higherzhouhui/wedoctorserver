const UTIL = {
  sendTypeFormat: (req, res, msg, code, data) => {
    res.send({msg: msg, code: code, data})
    console.log(`${new Date()}-${req.url}:  ${msg}`)
  },
  formatTime: (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs =  Math.floor(seconds % 60);
  
    let formattedTime = '';
  
    if (hours > 0) {
      formattedTime += hours + '小时 ';
    }
    if (minutes > 0) {
      formattedTime += minutes + '分钟 ';
    }
    if (secs > 0) {
      formattedTime += secs + '秒';
    }
  
    return formattedTime;
  }
}

module.exports = UTIL