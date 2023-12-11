const express = require('express') 
// 创建服务器express模块，express框架是原生api共存的,所以使用此框架时可以使用任何原生方法属性
const mysql = require('mysql') // mysql数据库模块
const log4js = require('log4js') // 打印log模块
const path = require('path') // 路径模块
var bodyParser = require("body-parser");
const expressStatic = require('express-static') // 引入静态资源模块
const fs = require('fs') // 读文件模块
const userRouter = require('./router/user')
// var superagent = require('superagent'); //http://visionmedia.github.io/superagent/#response-properties 文档地址
const cors = require('cors');

// Enable CORS

let server = express() // 创建服务器
let serPort = 1210 // 监听端口
server.use(cors());
server.use(express.static('public'))
server.use(bodyParser.urlencoded({
  extended: false
}));
server.use(bodyParser.json());

server.listen(serPort, () => {
	console.log(`Nodejs Server is opend: 127.0.0.1:${serPort}\n\n`);
})

/******************以下为此服务支持跨域请求********************/
server.all('*',function(req, res, next) {//处理跨域
  // 设置响应头，指定响应时间
  res.header('X-Response-Time', '50000ms');
	res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Token');

  // 检查是否是预检请求（OPTIONS请求）
  if (req.method === 'OPTIONS') {
    // 返回200状态码，表示允许跨域请求
    res.sendStatus(200);
  } else {
    // 继续处理正常的请求
    next();
  }
})



// let db = mysql.createPool({host: '127.0.0.1', user: 'root',port: 3306, 
//  password: '123456', database: 'questionsys'})  // 创建本地连接池

// db.getConnection((err, connection) =>{

// if(err){

// console.log('连接失败')

// }else{

// console.log('数据库连接成功')
// }})

// 统一注册路由

server.use(userRouter)