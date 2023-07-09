"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// This file is auto-generated, don't edit it
var dysmsapi20170525_1 = require("@alicloud/dysmsapi20170525"), $Dysmsapi = dysmsapi20170525_1;
var $OpenApi = require("@alicloud/openapi-client");
var tea_console_1 = require("@alicloud/tea-console");
var tea_util_1 = require("@alicloud/tea-util");
var time_1 = require("@darabonba/time");
var darabonba_string_1 = require("@alicloud/darabonba-string");
var Client = /** @class */ (function () {
    function Client() {
    }
    // 使用AK&SK初始化账号Client  
    Client.createClient = function (accessKeyId, accessKeySecret) {
        var config = new $OpenApi.Config({});
        config.accessKeyId = accessKeyId;
        config.accessKeySecret = accessKeySecret;
        return new dysmsapi20170525_1.default(config);
    };
    Client.main = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var client, sendReq, sendResp, code, bizId, phoneNums, _i, phoneNums_1, phoneNum, queryReq, queryResp, dtos, _a, dtos_1, dto;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        client = Client.createClient('LTAI5tFLANvCB1z7MryHiPAo', 'iuSLkpN2NAWGKKOSjcefXPUcHaGoj1');
                        sendReq = new $Dysmsapi.SendSmsRequest({
                            phoneNumbers: args[0],
                            signName: args[1],
                            templateCode: args[2],
                            templateParam: args[3],
                        });
                        return [4 /*yield*/, client.sendSms(sendReq)];
                    case 1:
                        sendResp = _b.sent();
                        code = sendResp.body.code;
                        if (!tea_util_1.default.equalString(code, "OK")) {
                            tea_console_1.default.log("\u9519\u8BEF\u4FE1\u606F: ".concat(sendResp.body.message));
                            return [2 /*return*/];
                        }
                        bizId = sendResp.body.bizId;
                        // 2. 等待 10 秒后查询结果
                        return [4 /*yield*/, tea_util_1.default.sleep(10000)];
                    case 2:
                        // 2. 等待 10 秒后查询结果
                        _b.sent();
                        phoneNums = darabonba_string_1.default.split(args[0], ",", -1);
                        _i = 0, phoneNums_1 = phoneNums;
                        _b.label = 3;
                    case 3:
                        if (!(_i < phoneNums_1.length)) return [3 /*break*/, 6];
                        phoneNum = phoneNums_1[_i];
                        queryReq = new $Dysmsapi.QuerySendDetailsRequest({
                            phoneNumber: tea_util_1.default.assertAsString(phoneNum),
                            bizId: bizId,
                            sendDate: time_1.default.format("yyyyMMdd"),
                            pageSize: 10,
                            currentPage: 1,
                        });
                        return [4 /*yield*/, client.querySendDetails(queryReq)];
                    case 4:
                        queryResp = _b.sent();
                        dtos = queryResp.body.smsSendDetailDTOs.smsSendDetailDTO;
                        // 打印结果
                        for (_a = 0, dtos_1 = dtos; _a < dtos_1.length; _a++) {
                            dto = dtos_1[_a];
                            if (tea_util_1.default.equalString("".concat(dto.sendStatus), "3")) {
                                tea_console_1.default.log("".concat(dto.phoneNum, " \u53D1\u9001\u6210\u529F\uFF0C\u63A5\u6536\u65F6\u95F4: ").concat(dto.receiveDate));
                            }
                            else if (tea_util_1.default.equalString("".concat(dto.sendStatus), "2")) {
                                tea_console_1.default.log("".concat(dto.phoneNum, " \u53D1\u9001\u5931\u8D25"));
                            }
                            else {
                                tea_console_1.default.log("".concat(dto.phoneNum, " \u6B63\u5728\u53D1\u9001\u4E2D..."));
                            }
                        }
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return Client;
}());
exports.default = Client;
