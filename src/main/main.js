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
    var deletePiPiXia = [];
    let pipixiaData = ConfigManager.get().pipixiaPath;

    let initData = async () => {
        new_json["levels"].forEach(function (value, index, arr) {
            let data = value["data"];
            versionSet.forEach(function (values, key, arr) {
                if (value["ppx_id"] == key) {
                    if (data !== values) {
                        deletePiPiXia.push(data);
                        Editor.log("获得需要删除的皮皮虾数据===>", deletePiPiXia);
                    }
                    value["data"] = values + "";
                    indexArr.push(parseInt(index));
                    jsonDataArr.push(value)
                }
            });
        });
        for (let i = 0; i < indexArr.length; i++) {
            new_json["levels"][indexArr[i]] = jsonDataArr[i];
        }
    }

    await initData();
    Fs.writeFile(configPath, JSON.stringify(new_json), 'utf-8', function (arr) {
        let configData = ConfigManager.get().config;
        let configUrl = configData.split("assets");
        let pipixiaUrl = pipixiaData.split("assets");
        Editor.assetdb.refresh("db://assets/" + pathData.join(configUrl[configUrl.length - 1] + ".json"), function (err, results) {
            Editor.log('updata asset!');
        });
        Editor.assetdb.refresh("db://assets/" + pathData.join(pipixiaUrl[pipixiaUrl.length - 1]), function (err, results) {
            Editor.log('updata asset!');
            deletePreviousPiPiXia(deletePiPiXia);
        });
    });
}

async function deletePreviousPiPiXia(pipixiaArr) {
    function delPath(path) {
        // if (path.indexOf('./') !== 0 || path.indexOf('../') !== 0) {
        //     return console.log("为了安全仅限制使用相对定位..");
        // }
        if (!Fs.existsSync(path)) {
            console.log("路径不存在");
            return "路径不存在";
        }
        var info = Fs.statSync(path);
        if (info.isDirectory()) {//目录
            var data = Fs.readdirSync(path);
            if (data.length > 0) {
                for (var i = 0; i < data.length; i++) {
                    delPath(`${path}/${data[i]}`); //使用递归
                    if (i == data.length - 1) { //删了目录里的内容就删掉这个目录
                        delPath(`${path}`);
                    }
                }
            } else {
                console.log("删除空目录");
                Fs.rmdirSync(path);//删除空目录
            }
        } else if (info.isFile()) {
            console.log("删除文件");
            Fs.unlinkSync(path);//删除文件
        }
    }
    for (let i = 0; i < pipixiaArr.length; i++) {
        // deletePiPiXia.push(pathData.json(pipixiaData + "/" + data + ".txt"));
        delPath(pathData.join(ConfigManager.get().pipixiaPath + "/" + pipixiaArr[i] + ".txt"));
    }
    // delPath("D:\\v2rayw");  //确认路径。__ 。没有后悔药
    let pipixiaData = ConfigManager.get().pipixiaPath;
    let pipixiaUrl = pipixiaData.split("assets");
    Editor.assetdb.refresh("db://assets/" + pathData.join(pipixiaUrl[pipixiaUrl.length - 1]), function (err, results) {
        Editor.log("<===remove the end===>");
        Editor.log('updata asset!');
    });
} 
