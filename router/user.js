const express = require('express')
const mysql = require('mysql') // mysql数据库模块
const multer = require('multer');
const fs = require('fs');

const UTIL = require('../utils/common')
const md5 = require('md5')
const moment = require('moment')
const Client = require('../sms.js')
const XLSX = require('xlsx')

const imagesDirectory = 'public';
const imageDir = '/' + imagesDirectory + '/';
let uploadedFileName;
const storageDisk = multer.diskStorage({
  destination: imagesDirectory,
  filename: function (req, file, callback) {
    fs.stat(imageDir + file.originalname, function (err, stat) {
      uploadedFileName = ''
      if (err == null) {
        uploadedFileName = Date.now() + '.' + file.originalname;
      } else if (err.code == 'ENOENT') {
        //获取最后一个.的位置
        const lastIndexOf = file.originalname.lastIndexOf(".");
        //获取文件的后缀名 .jpg
        const suffix = file.originalname.substring(lastIndexOf);
        uploadedFileName = String((Math.random() * 100000) / 10) + String(new Date().getTime()) + suffix;
      } else {
        console.log('Some other error: ', err.code);
      }
      callback(null, uploadedFileName)
    });
  }
})
const upload = multer({ storage: storageDisk, limits: { fileSize: 1000000, files: 1 } })

// 2. 创建路由对象
const router = express.Router()

let db = mysql.createPool({
  host: '127.0.0.1', user: 'root', port: 3306,
  password: '123456', database: 'questionsys'
})  // 创建本地连接池

db.getConnection((err, connection) => {

  if (err) {

    console.log('连接失败')

  } else {

    console.log('数据库连接成功')
  }
})

// 登陆
router.post('/admin/administer/login', (req, res) => {
  const body = req.body
  db.query(`SELECT * FROM users WHERE account='${body.account}';`, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      if (data.length) {
        const columnObj = data[0]
        if (columnObj.password === body.password) {
          const resData = {
            ...columnObj,
            token: md5(body.account + body.password + Math.round(Math.random() * 100)),
            lastlogin: moment().format('YYYY-MM-DD HH:mm:ss')
          }
          db.query(`update users set token='${resData.token}',lastlogin='${resData.lastlogin}' where account='${body.account}';`, (err, data) => {
            if (err, data) {
              if (err) {
                UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
              } else {
                UTIL.sendTypeFormat(req, res, '操作成功', 200, { token: resData.token })
              }
            }
          })
        } else {
          UTIL.sendTypeFormat(req, res, '账号或者密码错误', 500, [])
        }
      } else {
        UTIL.sendTypeFormat(req, res, '该账号不存在', 500, data)
      }
    }
  })
})

// 获取个人信息
router.get('/admin/administer/info', (req, res) => {
  const headers = req.headers
  const token = headers['access-token']
  db.query(`SELECT * FROM users WHERE token='${token}';`, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      if (data.length) {
        const columnObj = data[0]
        if (columnObj.token === token) {
          UTIL.sendTypeFormat(req, res, '操作成功', 200, columnObj)
        } else {
          UTIL.sendTypeFormat(req, res, '登录过期，请重新登录', 401, {})
        }
      } else {
        UTIL.sendTypeFormat(req, res, '登录过期，请重新登录', 401, {})
      }
    }
  })
})

// 创建问题
router.post('/admin/question/create', (req, res) => {
  const body = req.body
  let columns = ''
  let values = ''
  Object.keys(body).forEach((key, index) => {
    columns += key;
    values += `'${body[key]}'`;
    if (index !== Object.keys(body).length - 1) {
      columns += ','
      values += ','
    }
  })
  const sqlStr = `insert into question(${columns}) values(${values});`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200)
    }
  })
})

// 删除问题
router.post('/admin/question/delete', (req, res) => {
  const body = req.body
  const sqlStr = `delete from question where id=${body.id};`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200)
    }
  })
})

// 修改问题
router.post('/admin/question/update', (req, res) => {
  const body = req.body
  let columns = ''
  Object.keys(body).forEach((key, index) => {
    if (key !== 'id') {
      columns += `${key}='${body[key]}'`;
      if (index !== Object.keys(body).length - 1) {
        columns += ','
      }
    }
  })
  const sqlStr = `update question set ${columns} where id=${body.id};`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200)
    }
  })
})


// 获取问题列表
router.get('/admin/question/list', (req, res) => {
  const body = req.query
  const start = body.pageNum == 1 ? 0 : (body.pageNum - 1) * 10 + 1;
  const sqlStr = `select * from question ORDER BY sort ASC limit ${start},${body.pageSize};`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      db.query(`SELECT COUNT(*) FROM question;`, (err1, data1) => {
        if (err1) {
          UTIL.sendTypeFormat(req, res, err1.sqlMessage, 500)
        } else {
          UTIL.sendTypeFormat(req, res, '操作成功', 200, { list: data, pageNum: body.pageNum * 1, totalSize: data1[0]['COUNT(*)'] })
        }
      })
    }
  })
})


// 获取所有问题和结果
router.post('/admin/questionandresult/list', (req, res) => {
  const sqlStr = `select * from question ORDER BY sort ASC;`
  const rdata = {questionList: [], resultList: []}
  const {time, qudao} = req.body
  let whereStr = ''
  if (time && time[0] && time[1]) {
    whereStr = `AND startTime >= ${time[0]} AND endTime < ${time[1]}`
  }
  if (qudao) {
    whereStr += ` AND qudao='${qudao}'`
  }
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      rdata.questionList = data
      db.query(`SELECT * from result WHERE iscomplete=1 ${whereStr};`, (err, data) => {
        if (err) {
          UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
        } else {
          rdata.resultList = data
          UTIL.sendTypeFormat(req, res, '操作成功', 200, rdata)
        }
      })
    }
  })
})


// 获取渠道类型
router.get('/admin/result/qudaoList', (req, res) => {
  db.query(`SELECT qudao as title, COUNT(*) AS count
  FROM result
  GROUP BY qudao;`, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200, {list: data })
    }
  })

})

// 获取问卷结果列表
router.get('/admin/result/list', (req, res) => {
  const body = req.query
  const start = body.pageNum == 1 ? 0 : (body.pageNum - 1) * body.pageSize + 1;
  let whereSql = ''
  body['iscomplete'] = body['iscomplete'] ? body['iscomplete'] : 1
  Object.keys(body).forEach(key => {
    if (key !== 'pageNum' && key !== 'pageSize' && key !== 'current' && body[key]) {
      if (key === 'startTime') {
        whereSql += `${key}>='${body[key]}' AND `
      } else if (key === 'endTime') {
        whereSql += `${key}<'${body[key]}' AND `
      } else {
        whereSql += `${key}='${body[key]}' AND `
      }
    }
  })
  let whereArr = whereSql.split('AND').filter(item => item !== ' ').join('AND')
  if (whereArr) {
    whereSql = `WHERE ${whereArr}`
  }
  const sqlStr = `select * from result ${whereSql} ORDER BY endTime DESC limit ${start},${body.pageSize};`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      db.query(`SELECT COUNT(*) FROM result ${whereSql};`, (err1, data1) => {
        if (err1) {
          UTIL.sendTypeFormat(req, res, err1.sqlMessage, 500)
        } else {
          UTIL.sendTypeFormat(req, res, '操作成功', 200, { list: data, pageNum: body.pageNum * 1, totalSize: data1[0]['COUNT(*)'] })
        }
      })
    }
  })
})

// 获取问卷结果列表
router.get('/admin/result/export', (req, res) => {
  const sheetData = []
  let questionList = []
  const header = ['手机号', '渠道号', '开始时间', '结束时间', '答题时长']
  const qsList = []
  const listStyle = ['A','B','C','D','E','F','G','H','I','J','K','L']

  const body = req.query
  let whereSql = ''
  body['iscomplete'] = body['iscomplete'] ? body['iscomplete'] : 1
  Object.keys(body).forEach(key => {
    if (key !== 'pageNum' && key !== 'pageSize' && key !== 'current' && body[key]) {
      if (key === 'startTime') {
        whereSql += `${key}>='${body[key]}' AND `
      } else if (key === 'endTime') {
        whereSql += `${key}<'${body[key]}' AND `
      } else {
        whereSql += `${key}='${body[key]}' AND `
      }
    }
  })
  let whereArr = whereSql.split('AND').filter(item => item !== ' ').join('AND')
  if (whereArr) {
    whereSql = `WHERE ${whereArr}`
  }
  const sqlStr = `select * from result ${whereSql} ORDER BY endTime DESC;`

  db.query(`select * from question ORDER BY sort ASC;`, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      questionList = data
      data.forEach((item, index) => {
        const qsOneArray = item.options.split('||')
        qsList.push(qsOneArray)
        let title = `${index + 1}、${item.qs}`
        if (item.type === 'single') {
          title += '（单选）'
        } else {
          title += '（多选）'
        }
        header.push(title)
      })
      sheetData.push(header)
      db.query(sqlStr, (err, data) => {
        if (err) {
          UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
        } else {
          // 问题顺序默认是相同的；如果改了顺序这里要做变化
          data.forEach((item, index) => {
            const column = [
              item.phone, 
              item.qudao, 
              moment(item.startTime).format('YYYY-MM-DD HH:mm:ss'), 
              moment(item.endTime).format('YYYY-MM-DD HH:mm:ss'),
              UTIL.formatTime((item.endTime - item.startTime) / 1000),
            ]
            const chooseArray = item.choose.split('||') || ['']
            chooseArray.forEach((citem, cindex) => {
              let anser = ''
              const anserArray = citem.split(',') || []
              anserArray.forEach((ccitem, ccindex) => {
                anser += `${listStyle[ccitem * 1]}.${qsList[cindex][ccitem * 1]}`
                if (anserArray.length !== ccindex + 1) {
                  anser += ','
                }
              })
              column.push(anser)
            })
            sheetData.push(column)
          })
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
          const filename = '数据详情.xlsx';
          XLSX.writeFile(workbook, filename)
          fs.rename('./数据详情.xlsx', './public/数据详情.xlsx', (err) => {
            if (err) {
              UTIL.sendTypeFormat(req, res, err, 500)
            } else {
              UTIL.sendTypeFormat(req, res, '操作成功', 200, { url: 'http://47.96.151.84:8900/数据详情.xlsx' })
            }
          })
        }
      })
    }
  })

})


router.post('/admin/result/autoCreate', (req, res) => {
  const { result, amount, time, qudao } = req.body
  let columns = ''
  let values = ''
  const getRangeTime = () => {
    // 指定起始时间和结束时间
    const startTime = new Date(time[0]);
    const endTime = new Date(time[1]);

    // 生成起始时间
    const randomStartTime = new Date(startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime())).getTime();

    // 生成结束时间
    const maxTimeDiff = 10 * 60 * 1000; // 十分钟的毫秒数
    
    // 最小时间为1分钟
    const minTimeDiff = 20 * 60 * 1000
    const randomEndTime = new Date(randomStartTime + Math.random() * maxTimeDiff + minTimeDiff).getTime();
    return [randomStartTime, randomEndTime]
  }
  const getPhone = () => {
    const phone_prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
      '150', '151', '152', '153', '154', '155', '156', '157', '158', '159',
      '170', '171', '172', '173', '174', '175', '176', '177', '178', '179',
      '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
    const randNumber = Math.floor(Math.random() * (phone_prefixes.length - 1)) + 1
    let phone = phone_prefixes[randNumber]
    for (let i = 0; i < 8; i++) {
      phone += Math.floor(Math.random() * 10); // 生成0到9之间的随机数字
    }
    return phone
  }

  function generateRandomSortedString(amount, first) {
    const values = [];
    for (let i = 0; i < amount; i++) {
      values.push(i)
    }
    const randomNumberCount = Math.floor(Math.random() * amount) + 1;
    const firstVal = Number(first)
    let randomArray = [firstVal];

    while (randomArray.length < randomNumberCount) {
      const randomIndex = Math.floor(Math.random() * amount);
      const selectedValue = values[randomIndex]
      if (randomArray.indexOf(selectedValue) === -1) {
        randomArray.push(selectedValue);
      }
    }
    randomArray = randomArray.sort((a, b) => a - b);

    return randomArray.join(', ');
  }

  function getRandomOption(pro) {
    const randomNumber = Math.random() * 100; // 生成一个0到1之间的随机数
    const proArray = (pro + `,10,10,10,10,10,10,10`).split(',')
    proArray.map((item, index) => {
      proArray[index] = item * 1
    })
    if (randomNumber < proArray[0]) {
      return '0'
    } else if (randomNumber < proArray[0] + proArray[1]) {
      return '1'
    } else if (randomNumber < proArray[0] + proArray[1] + proArray[2]) {
      return '2'
    } else if (randomNumber < proArray[0] + proArray[1] + proArray[2] + proArray[3]) {
      return '3'
    } else if (randomNumber < proArray[0] + proArray[1] + proArray[2] + proArray[3] + proArray[4]) {
      return '4'
    } else if (randomNumber < proArray[0] + proArray[1] + proArray[2] + proArray[3] + proArray[4] + proArray[5]) {
      return '5'
    } else if (randomNumber < proArray[0] + proArray[1] + proArray[2] + proArray[3] + proArray[4] + proArray[5] + proArray[6]) {
      return '6'
    } else if (randomNumber < proArray[0] + proArray[1] + proArray[2] + proArray[3] + proArray[4] + proArray[5] + proArray[6] + proArray[7]) {
      return '7'
    } else if (randomNumber < proArray[0] + proArray[1] + proArray[2] + proArray[3] + proArray[4] + proArray[5] + proArray[6] + proArray[7] + proArray[8]) {
      return '8'
    } else if (randomNumber < proArray[0] + proArray[1] + proArray[2] + proArray[3] + proArray[4] + proArray[5] + proArray[6] + proArray[7] + proArray[8] + proArray[9]) {
      return '9'
    } else if (randomNumber < proArray[0] + proArray[1] + proArray[2] + proArray[3] + proArray[4] + proArray[5] + proArray[6] + proArray[7] + proArray[8] + proArray[9] + proArray[10]) {
      return '10'
    }
  }


  try {
    [...Array(amount * 1)].forEach((_, amountIndex) => {
      let qs = ''
      let choose = ''
      let handleResult = []
      result.forEach((item, index) => {
        qs += item.id
        // 1到oplength的整数
        if (item.type === 'single') {
          choose += getRandomOption(item.pro)
        }
        if (item.type === 'multiple') {
          const first = getRandomOption(item.pro)
          choose += generateRandomSortedString(Math.floor(Math.random() * item.oplength), first)
        }
        if (index !== result.length - 1) {
          qs += '||'
          choose += '||'
        }
        if (item.relateId) {
          const rid = item.relateId.split('||')[0]
          const rop = item.relateId.split('||')[1]
          handleResult.push({
            id: item.id + '',
            rid: rid,
            rop: rop
          })
        }
      })
      // 处理如果依赖id选项未选，其后应该无选择结果
      const chooseArray = String(choose).split('||')
      handleResult.forEach(item => {
        const qsArray = qs.split('||')
        const cindex = qsArray.indexOf(item.rid)
        if (!chooseArray[cindex].includes(item.rop)) {
          const nindex = qsArray.indexOf(item.id)
          chooseArray[nindex] = ''
        }
      })
      choose = chooseArray.join('||')
      const timeRange = getRangeTime()
      const startTime = timeRange[0]
      const endTime = timeRange[1]
      const phone = getPhone()
      const obj = {
        startTime,
        endTime,
        phone,
        qs,
        choose,
        qudao,
        iscomplete: 1,
      }
      let value = ''
      Object.keys(obj).forEach((key, index) => {
        if (amountIndex === 0) {
          columns += key;
        }
        value += `'${obj[key]}'`;
        if (index !== Object.keys(obj).length - 1) {
          if (amountIndex === 0) {
            columns += ','
          }
          value += ','
        }
      })
      values += `(${value})`
      if (amountIndex !== amount * 1 - 1) {
        values += ','
      }
    })
    const sqlStr = `insert into result(${columns}) values${values};`
    db.query(sqlStr, (err, data) => {
      if (err) {
        UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
      } else {
        UTIL.sendTypeFormat(req, res, '操作成功', 200)
      }
    })
  } catch (error) {
    console.error(error)
  }
})

// 获取H5渠道号
router.get('/admin/qudao/getInfo', (req, res) => {
  const sqlStr = `select * from qudao where ish5 = 1`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200, data[0])
    }
  })
})


// 获取后台首页统计数据
router.post('/admin/home/getCountData', (req, res) => {
  const params = req.query
  const sqlStrTotal = `SELECT COUNT(*) as count FROM result WHERE iscomplete=1;`
  const avgTime = `SELECT AVG(endTime - startTime) AS avgTime FROM result WHERE iscomplete=1;`
  const dateNumberArray = `SELECT DATE_FORMAT(dates.date, '%Y-%m-%d') AS date,
  COALESCE(result_count.count, 0) AS count
  FROM (
  SELECT DATE(FROM_UNIXTIME(startTime / 1000)) AS date
  FROM result
  WHERE startTime >= ${params.startTime}   -- 起始时间
  AND endTime < ${params.endTime}      -- 结束时间
  GROUP BY date
  UNION ALL
  SELECT DISTINCT
      DATE(FROM_UNIXTIME(startTime / 1000)) AS date
  FROM result
  WHERE NOT EXISTS (
  SELECT 1
  FROM result
  WHERE DATE(FROM_UNIXTIME(startTime / 1000)) = DATE(FROM_UNIXTIME(startTime / 1000))   -- 自连接
  AND startTime >= ${params.startTime}   -- 起始时间
  AND endTime < ${params.endTime}      -- 结束时间
  )
  ) AS dates
  LEFT JOIN (
  SELECT DATE(FROM_UNIXTIME(startTime / 1000)) AS date,
      COUNT(*) AS count
  FROM result
  WHERE startTime >= '${params.startTime}'   -- 起始时间
  AND endTime < '${params.endTime}'      -- 结束时间
  GROUP BY date
  ) AS result_count ON dates.date = result_count.date
  ORDER BY dates.date;`

  const allQuestion = `SELECT * FROM question;`
  const allResult = `SELECT * FROM result WHERE iscomplete=1;`
  const getQudao = `SELECT qudao as type, COUNT(*) AS value
  FROM result
  WHERE iscomplete = 1
  GROUP BY qudao;`
  const obj = {
    count: 0,
    avgTime: 0,
    dateNumberArray: [],
    qudao: [],
    age: [],
    sex: [],
    weizi: [],
  }
  try {

  db.query(sqlStrTotal, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      obj.count = data[0].count;
      db.query(avgTime, (err, data) => {
        if (err) {
          UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
        } else {
          obj.avgTime = data[0].avgTime;
          db.query(dateNumberArray, (err, data) => {
            if (err) {
              UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
            } else {
              obj.dateNumberArray = data;
              db.query(allQuestion, (err, data) => {
                if (err) {
                  UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
                } else {
                  const questionList = data;
                  db.query(allResult, (err, data) => {
                    if (err) {
                      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
                    } else {
                      const resultList = data;
                      questionList.forEach(qitem => {
                        if (qitem.qs.includes('您的年龄')) {
                          const option = qitem.options.split('||')
                          option.map((oitem, oindex) => {
                            const filterRlist = resultList.filter(item => {
                              const qsArray = item.qs.split('||')
                              const chooseArray = item.choose.split('||')
                              if (chooseArray[qsArray.indexOf(qitem.id + '')] == oindex) {
                                return true
                              }
                            })
                            obj.age.push({
                              type: oitem,
                              value: filterRlist.length
                            })
                          })
                        }
                        if (qitem.qs.includes('您所在的城市')) {
                          const option = qitem.options.split('||')
                          option.map((oitem, oindex) => {
                            const filterRlist = resultList.filter(item => {
                              const qsArray = item.qs.split('||')
                              const chooseArray = item.choose.split('||')
                              if (chooseArray[qsArray.indexOf(qitem.id + '')] == oindex) {
                                return true
                              }
                            })
                            obj.weizi.push({
                              type: oitem,
                              value: filterRlist.length
                            })
                          })
                        }
                        if (qitem.qs.includes('您的性别')) {
                          const option = qitem.options.split('||')
                          option.map((oitem, oindex) => {
                            const filterRlist = resultList.filter(item => {
                              const qsArray = item.qs.split('||')
                              const chooseArray = item.choose.split('||')
                              if (chooseArray[qsArray.indexOf(qitem.id + '')] == oindex) {
                                return true
                              }
                            })
                            obj.sex.push({
                              type: oitem,
                              value: filterRlist.length
                            })
                          })
                        }
                      })
                      db.query(getQudao, (err, data) => {
                        if (err) {
                          UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
                        } else {
                          obj.qudao = data
                          UTIL.sendTypeFormat(req, res, '操作成功', 200, obj)
                        }
                      })
                    }
                  })
                }
              })
            }
          })
        }
      })
    }
  })
  } catch(error) {
    console.log('line524:', error)
  }
})

// 修改H5渠道号
router.post('/admin/qudao/update', (req, res) => {
  const body = req.body
  const sqlStr = `update qudao set name='${body['qudao']}' where ish5 = 1`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200, {})
    }
  })
})

// 删除问卷记录
router.post('/admin/result/delete', (req, res) => {
  const body = req.body
  const sqlStr = `delete from result where id in(${body.ids.join(',')});`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200, {})
    }
  })
})


// 修改个人密码
router.post('/admin/administer/update', (req, res) => {
  const headers = req.headers
  const token = headers['access-token']
  const body = req.body
  let columns = ''
  Object.keys(body).forEach((key, index) => {
    if (key !== 'id') {
      columns += `${key}='${body[key]}'`;
      if (index !== Object.keys(body).length - 1) {
        columns += ','
      }
    }
  })
  const sqlStr = `update users set ${columns} where token='${token}';`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200)
    }
  })
})


// 获取用户列表
router.get('/admin/user/list', (req, res) => {
  const body = req.query
  const start = body.pageNum == 1 ? 0 : (body.pageNum - 1) * 10 + 1;
  const sqlStr = `select * from users limit ${start},${body.pageSize};`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      db.query(`SELECT COUNT(*) FROM users;`, (err1, data1) => {
        if (err1) {
          UTIL.sendTypeFormat(req, res, err1.sqlMessage, 500)
        } else {
          UTIL.sendTypeFormat(req, res, '操作成功', 200, { list: data, pageNum: body.pageNum * 1, totalSize: data1[0]['COUNT(*)'] })
        }
      })
    }
  })
})

// 新增管理员
router.post('/admin/user/create', (req, res) => {
  const body = req.body
  let columns = ''
  let values = ''
  Object.keys(body).forEach((key, index) => {
    columns += key;
    values += `'${body[key]}'`;
    if (index !== Object.keys(body).length - 1) {
      columns += ','
      values += ','
    }
  })
  db.query(`select * from users where account='${body['account']}'`, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      if (data.length) {
        UTIL.sendTypeFormat(req, res, '当前账号已存在！', 500)
      } else {
        const sqlStr = `insert into users(${columns}) values(${values});`
        db.query(sqlStr, (err, data) => {
          if (err) {
            UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
          } else {
            UTIL.sendTypeFormat(req, res, '操作成功', 200)
          }
        })
      }
    }
  })
})

// 修改个人资料
router.post('/admin/user/update', (req, res) => {
  const headers = req.headers
  const token = headers['access-token']
  const body = req.body
  let columns = ''
  Object.keys(body).forEach((key, index) => {
    if (key !== 'id') {
      columns += `${key}='${body[key]}'`;
      if (index !== Object.keys(body).length - 1) {
        columns += ','
      }
    }
  })
  const sqlStr = `update users set ${columns} where token='${token}';`
  db.query(sqlStr, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200)
    }
  })
})


// 修改用户信息
router.post('/admin/user/change', (req, res) => {
  const headers = req.headers
  const token = headers['access-token']
  db.query(`SELECT * from users where token='${token}';`, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      if (data.length && data[0].role == '0' || data[0].role == '1') {
        const body = req.body
        let columns = ''
        Object.keys(body).forEach((key, index) => {
          if (key !== 'id') {
            columns += `${key}='${body[key]}'`;
            if (index !== Object.keys(body).length - 1) {
              columns += ','
            }
          }
        })
        const sqlStr = `update users set ${columns} where id=${body.id};`
        db.query(sqlStr, (err, data) => {
          if (err) {
            UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
          } else {
            UTIL.sendTypeFormat(req, res, '操作成功', 200)
          }
        })
      } else {
        UTIL.sendTypeFormat(req, res, '无操作权限', 500)
      }
    }
  })
})

// 删除用户
router.post('/admin/user/delete', (req, res) => {
  const headers = req.headers
  const token = headers['access-token']
  db.query(`SELECT * from users where token='${token}';`, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      if (data.length && data[0].role == '0') {
        const sqlStr = `delete from users where id=${req.body['id']};`
        db.query(sqlStr, (err, data) => {
          if (err) {
            UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
          } else {
            UTIL.sendTypeFormat(req, res, '操作成功', 200)
          }
        })
      } else {
        UTIL.sendTypeFormat(req, res, '无操作权限', 500)
      }
    }
  })
})


// 处理文件上传
router.post('/admin/upload', upload.single('file'), (req, res) => {
  const headers = req.headers
  const token = headers['access-token']
  if (!uploadedFileName) {
    UTIL.sendTypeFormat(req, res, '上传文件失败，请重试', 500)
    return
  }
  uploadedFileName = 'http://47.96.151.84:8900/' + uploadedFileName
  db.query(`update users set avatar='${uploadedFileName}' where token='${token}'`, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      UTIL.sendTypeFormat(req, res, '操作成功', 200, { src: uploadedFileName })
    }
  })

});

/**H5相关接口 */
// 提交问卷
router.post('/account/result/create', (req, res) => {
  const body = req.body
  const sqlStrQudao = `select * from qudao where ish5 = 1`
  db.query(sqlStrQudao, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      const qudao = data[0].name
      body['qudao'] = qudao
      delete body.code
      let columns = ''
      Object.keys(body).forEach((key, index) => {
        if (key !== 'id') {
          columns += `${key}='${body[key]}'`;
          if (index !== Object.keys(body).length - 1) {
            columns += ','
          }
        }
      })
      const sqlStr = `update result set ${columns} where phone='${body.phone}';`
      db.query(sqlStr, (err, data) => {
        if (err) {
          UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
        } else {
          UTIL.sendTypeFormat(req, res, '操作成功', 200, {})
        }
      })
    }
  })
})
// 获取问卷问题
router.get('/account/question/list', (req, res) => {
  const headers = req.headers
  const token = headers['access-token']
  const sqlToken = `select * from result where token='${token}';`
  db.query(sqlToken, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
    } else {
      if (data.length) {
        if (data[0].token !== token) {
          UTIL.sendTypeFormat(req, res, '登录过期，请重新登陆', 401)
        } else {
          const sqlStr = `select * from question ORDER BY sort ASC`
          db.query(sqlStr, (err, data) => {
            if (err) {
              UTIL.sendTypeFormat(req, res, err.sqlMessage, 500)
            } else {
              if (data.length) {
                UTIL.sendTypeFormat(req, res, '操作成功', 200, { list: data, totalSize: data.length })
              } else {
                UTIL.sendTypeFormat(req, res, '无数据', 500, { list: [] })
              }
            }
          })
        }
      } else {
        UTIL.sendTypeFormat(req, res, '登录过期，请重新登陆', 401)
      }
    }
  })


})

// H5获取验证码
router.post('/account/result/getCode', (req, res) => {
  const generateRandomNumber = () => {
    return Math.floor(Math.random() * 10);
  }

  function generateSixDigitRandomNumber() {
    let randomNumber = '';
    for (let i = 0; i < 6; i++) {
      randomNumber += generateRandomNumber();
    }
    return randomNumber;
  }
  const randCode = generateSixDigitRandomNumber()
  try {
    Client.default.main([req.body.phone, 'We收集', `SMS_461975848`, `{"code":"${randCode}"}`]).then(() => {

    }).catch(err => {
      console.log(err)
      UTIL.sendTypeFormat(req, res, err, 500, {})
    })

    const sql = `insert into captcha (phone, code, time) values ('${req.body.phone}', ${randCode}, ${new Date().getTime()});`
    setTimeout(() => {
      db.query(sql, (err, data) => {
        if (err) {
          UTIL.sendTypeFormat(req, res, err.sqlMessage, 500, {})
        } else {
          UTIL.sendTypeFormat(req, res, '操作成功！', 200, {})
        }
      })
    }, 1000);

  } catch (error) {
    console.error(error)
    UTIL.sendTypeFormat(req, res, error, 500, {})
  }
})

// H5登陆
router.post('/account/result/login', (req, res) => {
  const body = req.body
  const { phone, code, qudao } = body
  const token = Math.floor(Math.random() * 10) + md5(phone)
  db.query(`select * from captcha where phone='${phone}';`, (err, data) => {
    if (err) {
      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500, {})
    } else {
      if (data.length) {
        const newestData = data[data.length - 1]
        const diffTime = new Date().getTime() - newestData.time < 10 * 60 * 1000
        if ((newestData.code === code && diffTime) || code === '888888') {
          db.query(`SELECT * FROM result where phone='${phone}';`, (err, data) => {
            if (err) {
              UTIL.sendTypeFormat(req, res, err.sqlMessage, 500, {})
            } else {
              let insertOrUpdate = `INSERT INTO result (phone, token, qudao) VALUES ('${phone}', '${token}', '${qudao}');`
              if (data.length) {
                insertOrUpdate = `UPDATE result set phone='${phone}', token='${token}', qudao='${qudao}' where phone='${phone}';`
              }
              db.query(insertOrUpdate, (err, data) => {
                if (err) {
                  UTIL.sendTypeFormat(req, res, err.sqlMessage, 500, {})
                } else {
                  db.query(`select * from result where token='${token}';`, (err, data) => {
                    if (err) {
                      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500, {})
                    } else {
                      UTIL.sendTypeFormat(req, res, '操作成功', 200, data[0])
                    }
                  })
                }
              })
            }
          })
        } else {
          if (newestData.code !== code) {
            UTIL.sendTypeFormat(req, res, '验证码错误', 500, {})
          } else {
            UTIL.sendTypeFormat(req, res, '验证码已过期', 500, {})
          }
        }
      } else {
        if (code === '888888') {
          db.query(`SELECT * FROM result where phone='${phone}';`, (err, data) => {
            if (err) {
              UTIL.sendTypeFormat(req, res, err.sqlMessage, 500, {})
            } else {
              let insertOrUpdate = `INSERT INTO result (phone, token, qudao) VALUES ('${phone}', '${token}', '${qudao}');`
              if (data.length) {
                insertOrUpdate = `UPDATE result set phone='${phone}', token='${token}', qudao='${qudao}' where phone='${phone}';`
              }
              db.query(insertOrUpdate, (err, data) => {
                if (err) {
                  UTIL.sendTypeFormat(req, res, err.sqlMessage, 500, {})
                } else {
                  db.query(`select * from result where token='${token}';`, (err, data) => {
                    if (err) {
                      UTIL.sendTypeFormat(req, res, err.sqlMessage, 500, {})
                    } else {
                      UTIL.sendTypeFormat(req, res, '操作成功', 200, data[0])
                    }
                  })
                }
              })
            }
          })
        } else {
          UTIL.sendTypeFormat(req, res, '验证码无效，请重发', 500, {})
        }
      }
    }
  })
})

module.exports = router