// This file is auto-generated, don't edit it
import Dysmsapi, * as $Dysmsapi from '@alicloud/dysmsapi20170525';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Console from '@alicloud/tea-console';
import Env from '@alicloud/darabonba-env';
import Util from '@alicloud/tea-util';
import Time from '@darabonba/time';
import String from '@alicloud/darabonba-string';
import * as $tea from '@alicloud/tea-typescript';


export default class Client {

  // 使用AK&SK初始化账号Client  
  static createClient(accessKeyId: string, accessKeySecret: string): Dysmsapi {
    let config = new $OpenApi.Config({ });
    config.accessKeyId = accessKeyId;
    config.accessKeySecret = accessKeySecret;
    return new Dysmsapi(config);
  }

  static async main(args: string[]): Promise<void> {
    let client = Client.createClient('LTAI5tFLANvCB1z7MryHiPAo', 'iuSLkpN2NAWGKKOSjcefXPUcHaGoj1');
    // 1.发送短信
    let sendReq = new $Dysmsapi.SendSmsRequest({
      phoneNumbers: args[0],
      signName: args[1],
      templateCode: args[2],
      templateParam: args[3],
    });

    let sendResp = await client.sendSms(sendReq);
    let code = sendResp.body.code;
    if (!Util.equalString(code, "OK")) {
      Console.log(`错误信息: ${sendResp.body.message}`);
      return ;
    }

    let bizId = sendResp.body.bizId;
    // 2. 等待 10 秒后查询结果
    await Util.sleep(10000);
    // 3.查询结果
    let phoneNums = String.split(args[0], ",", -1);

    for (let phoneNum of phoneNums) {
      let queryReq = new $Dysmsapi.QuerySendDetailsRequest({
        phoneNumber: Util.assertAsString(phoneNum),
        bizId: bizId,
        sendDate: Time.format("yyyyMMdd"),
        pageSize: 10,
        currentPage: 1,
      });
      let queryResp = await client.querySendDetails(queryReq);
      let dtos = queryResp.body.smsSendDetailDTOs.smsSendDetailDTO;
      // 打印结果

      for (let dto of dtos) {
        if (Util.equalString(`${dto.sendStatus}`, "3")) {
          Console.log(`${dto.phoneNum} 发送成功，接收时间: ${dto.receiveDate}`);
        } else if (Util.equalString(`${dto.sendStatus}`, "2")) {
          Console.log(`${dto.phoneNum} 发送失败`);
        } else {
          Console.log(`${dto.phoneNum} 正在发送中...`);
        }
      }
    }
  }
}
