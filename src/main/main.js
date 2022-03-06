'use strict';
const Fs = require('fs');
const pathData = require('path');
const ConfigManager = require('../common/config-manager');
const EditorAPI = require('./editor-api');
const FileUtil = require('../eazax/file-util');
module.exports = {
    load() {
        // execute when package loaded
    },
    unload() {
        // execute when package unloaded
    },
    // register your ipc messages here
    messages: {
        start() {

        },
        open() {
            Editor.log("打开界面");
            Editor.Panel.open('pipixia-automatic-configuration');
        },
        click(event, data) {
            if (data) {
                let dataArr = data.split(",");
                startMain(dataArr, ConfigManager.get().id);
            }
        },
        initpanel() {
            Editor.Ipc.sendToPanel('pipixia-automatic-configuration', 'initDatas', ConfigManager.get());
        },
        setData(event, data) {
            var datas = ConfigManager.get();
            switch (data.type) {
                case "cookie":
                    Editor.log("<===修改登录id===>");
                    datas.id = data.data;
                    break;
                case "pipixia":
                    Editor.log("<===修改皮皮虾路径===>");
                    datas.pipixiaPath = pathData.join(data.data);
                    break;
                case "chapter":
                    Editor.log("<===修改岛路径===>");
                    datas.config = pathData.join(data.data);
                    break;
            }
            ConfigManager.set(datas);
        }
    },
};
/**
 * 
 * @param {*} courseid 课程id
 * @param {*} id 登录id
 */
async function startMain(courseidArr, id) {
    var request = require('request');
    //post方式请求
    var url = 'https://pipixia.mathufo.com/practice/problem_set/get_all_by_id';
    var versionArr = new Map();

    for (let i = 0; i < courseidArr.length; i++) {
        request({
            url: url,
            method: 'post',
            json: true,
            headers: {
                'content-type': 'application/json',
                "cookie": "sessionid=" + id,
            },
            body: {
                id: courseidArr[i],
                lang: "zh-cn"
            },
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let version = body.data.current_version;
                Editor.log("open===>", body.data.current_version); // 请求成功的处理逻辑
                let url = pathData.join(ConfigManager.get().pipixiaPath + "/" + version + ".txt");
                const ws = Fs.createWriteStream(url, { autoClose: true });
                request("https://zyj-bj.oss-cn-beijing.aliyuncs.com/mathup/problems/" + version).pipe(ws);
                ws.on("finish", function (data) {
                    Editor.log("<===下载完成===>", data);
                    ws.close();
                    versionArr.set(parseInt(courseidArr[i]), version);
                    if (versionArr.size === courseidArr.length) {

                        let pipixiaData = ConfigManager.get().pipixiaPath;
                        let pipixiaUrl = pipixiaData.split("assets");
                        Editor.assetdb.refresh("db://assets/" + pathData.join(pipixiaUrl[pipixiaUrl.length - 1]), function (err, results) {
                            getLevelConfig(versionArr);
                        });
                    }
                });
            }
        });
    }
}

/**
  * 修改config里的内容
  */
async function getLevelConfig(versionSet) {
    var configPath = ConfigManager.get().config + ".json";
    let file = await FileUtil.readFile(configPath);
    let data = null;
    try {
        data = JSON.parse(file);
    } catch (error) {
        Editor.log('File parsing failure!', path);
        Editor.log('Error:', error);
    }
    if (!data) {
        return null;
    }
    await setLevelConfig(configPath, data, versionSet);
    return data;
}
/**
  * 修改config配置
  * @param {*} configPath config路径
  * @param {*} courseid 课件id
  * @param {*} data 皮皮虾配置文件
  * @param {*} versionid 皮皮虾名
  */
async function setLevelConfig(configPath, data, versionSet) {
    let new_str = JSON.stringify(data);
    let new_json = JSON.parse(new_str);
    var indexArr = [];
    var jsonDataArr = []
    // Editor.log("准备修改config", new_json["levels"]);
    for (let k in new_json["levels"]) {
        let json = new_json["levels"][k];
        let index = 0;
        versionSet.forEach(function (value, key, map) {
            if (new_json["levels"][k]["ppx_id"] == key) {
                json["data"] = value + "";
                indexArr.push(parseInt(index));
                jsonDataArr.push(json)
            }
            index++;
        });
    }
    for (let i = 0; i < indexArr.length; i++) {
        new_json["levels"][indexArr[i]] = jsonDataArr[i];
    }
    Fs.writeFile(configPath, JSON.stringify(new_json), 'utf-8', function (arr) {

        let configData = ConfigManager.get().config;
        let pipixiaData = ConfigManager.get().pipixiaPath;
        let configUrl = configData.split("assets");
        let pipixiaUrl = pipixiaData.split("assets");
        Editor.log('------modify successfully!------');
        Editor.assetdb.refresh("db://assets/" + pathData.join(pipixiaUrl[pipixiaUrl.length - 1]), function (err, results) {
            Editor.log('updata asset!');
        });
        Editor.assetdb.refresh("db://assets/" + pathData.join(configUrl[configUrl.length - 1]), function (err, results) {
            Editor.log('updata asset!');
        });
    });
}
