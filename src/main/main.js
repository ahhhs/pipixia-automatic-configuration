'use strict';
const Fs = require('fs');
const pathData = require('path');
const ConfigManager = require('../common/config-manager');
const FileUtil = require('../eazax/file-util');
let moreVersions = false;
module.exports = {
    load() {
        // execute when package loaded
    },
    unload() {
        // execute when package unloaded
    },
    // register your ipc messages here
    messages: {
        start() {},
        open() {
            Editor.log('打开界面');
            Editor.Panel.open('pipixia-automatic-configuration');
        },
        click(event, data, isMoreVersions) {
            moreVersions = isMoreVersions;
            if (data) {
                //是双版本
                let dataArr = data.split(',');
                //startMain(dataArr, ConfigManager.get().id); //单版本
            }
        },
        initpanel() {
            Editor.Ipc.sendToPanel(
                'pipixia-automatic-configuration',
                'initDatas',
                ConfigManager.get()
            );
        },
        setData(event, data) {
            var datas = ConfigManager.get();
            switch (data.type) {
                case 'cookie':
                    Editor.log('<===修改登录id===>');
                    datas.id = data.data;
                    break;
                case 'pipixia':
                    Editor.log('<===修改皮皮虾路径===>');
                    datas.pipixiaPath = pathData.join(data.data);
                    break;
                case 'chapter':
                    Editor.log('<===修改岛路径===>');
                    datas.config = pathData.join(data.data);
                    break;
            }
            ConfigManager.set(datas);
        },
    },
};
/**
 * 下载后
 * @param {*} courseid 课程id
 * @param {*} id 登录id
 */
async function startMain(courseidArr, id) {
    let getLevel = (versionArr) => {
        let pipixiaData = ConfigManager.get().pipixiaPath;
        let pipixiaUrl = pipixiaData.split('assets');
        Editor.assetdb.refresh(
            'db://assets/' + pathData.join(pipixiaUrl[pipixiaUrl.length - 1]),
            function (err, results) {
                getLevelConfig(versionArr);
            }
        );
    };
    let zhCourseidArr;
    let enCourseidArr;
    let versionJsonArr;
    if (moreVersions) {
        enCourseidArr = await downloadData(courseidArr, id, 'en-us');
        zhCourseidArr = await downloadData(courseidArr, id, 'zh-cn');
        versionJsonArr = jointVersionData(zhCourseidArr, enCourseidArr);
    } else {
        versionJsonArr = await downloadData(courseidArr, id, 'en-us');
    }
    getLevel(versionJsonArr);
}
/**
 * 拼接双版本的数据
 */
function jointVersionData(zhArr, enArr) {
    let courseidArr = [];
    zhArr.forEach((value, key, map) => {
        let courseidMap = new Map();
        enArr.forEach((values, keys, maps) => {
            if (key == keys) {
                courseidMap.set('v', key);
                courseidMap.set('en', values);
                courseidMap.set('zh', value);
                courseidArr.push(courseidMap);
            }
        });
    });
    return courseidArr;
}

/**
 * 这里已经开始下载皮皮虾数据了,
 */
async function downloadData(courseidArr, id, lang, cb) {
    var request = require('request');
    //post方式请求
    var url = 'https://pipixia.mathufo.com/practice/problem_set/get_all_by_id';
    var versionArr = new Map();
    for (let i = 0; i < courseidArr.length; i++) {
        let down = () => {
            return new Promise((resolve, reject) => {
                request(
                    {
                        url: url,
                        method: 'post',
                        json: true,
                        headers: {
                            'content-type': 'application/json',
                            cookie: 'sessionid=' + id,
                        },
                        body: {
                            id: courseidArr[i],
                            lang: lang,
                        },
                    },
                    function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            let version = body.data.current_version;
                            Editor.log('open===>', body.data.current_version); // 请求成功的处理逻辑
                            let url = pathData.join(
                                ConfigManager.get().pipixiaPath + '/' + version + '.txt'
                            );
                            const ws = Fs.createWriteStream(url, { autoClose: true });
                            request(
                                'https://zyj-bj.oss-cn-beijing.aliyuncs.com/mathup/problems/' +
                                    version
                            ).pipe(ws);
                            ws.on('finish', function (data) {
                                Editor.log('<===下载完成===>', data);
                                ws.close();
                                resolve();
                                versionArr.set(parseInt(courseidArr[i]), version);
                                if (versionArr.size === courseidArr.length) {
                                    cb && cb(versionArr);
                                }
                            });
                        }
                    }
                );
            });
        };
        await down();
    }
    return versionArr;
}

/**
 * 修改config里的内容,下载完成后准备对config进行修改
 */
async function getLevelConfig(versionSet) {
    var configPath = pathData.join(ConfigManager.get().config + '.json');
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
    var jsonDataArr = [];
    var deletePiPiXia = [];
    let pipixiaData = ConfigManager.get().pipixiaPath;
    let initData = async () => {
        new_json['levels'].forEach(function (value, index, arr) {
            let data = value['data'];
            versionSet.forEach(function (values, key, arr) {
                if (values instanceof Map) {
                    let mapJson = new Map(values);
                    if (value['ppx_id'] == mapJson.get('v')) {
                        if (data.length == 16) {
                            if (data !== values) {
                                deletePiPiXia.push(data);
                            }
                        } else {
                            let zhV = data.match(/{\"zh-cn\":\"(\S*)\",\"default/)[1];
                            let enV = data.match(/default\":\"(\S*)\"}/)[1];
                            if (zhV != mapJson.get('zh')) {
                                deletePiPiXia.push(zhV);
                            }
                            if (enV != mapJson.get('en')) {
                                deletePiPiXia.push(enV);
                            }
                        }
                        // value['data'] = "{\"zh-cn\":\""+ mapJson.get("zh")+"\",\"default\":\""+mapJson.get("en")+"\"}";
                        value['data'] = "{\"zh-cn\":\""+ mapJson.get("zh")+"\",\"default\":\""+mapJson.get("en")+"\"}";
                        indexArr.push(parseInt(index));
                        jsonDataArr.push(value);
                    }
                } else {
                    if (value['ppx_id'] == key) {
                        if (data !== values) {
                            deletePiPiXia.push(data);
                        }
                        value['data'] = values + '';
                        indexArr.push(parseInt(index));
                        jsonDataArr.push(value);
                    }
                }
                // Editor.log('获得需要删除的皮皮虾数据===>', deletePiPiXia);
            });
        });
        for (let i = 0; i < indexArr.length; i++) {
            new_json['levels'][indexArr[i]] = jsonDataArr[i];
        }
    };
    await initData();

    //保存数据
    Fs.writeFile(configPath, JSON.stringify(new_json), 'utf-8', function (arr) {
        let configData = ConfigManager.get().config;
        let configUrl = configData.split('assets');
        let pipixiaUrl = pipixiaData.split('assets');
        Editor.assetdb.refresh(
            'db://assets/' + pathData.join(configUrl[configUrl.length - 1] + '.json'),
            function (err, results) {
                Editor.log('updata asset!');
            }
        );
        Editor.assetdb.refresh(
            'db://assets/' + pathData.join(pipixiaUrl[pipixiaUrl.length - 1]),
            function (err, results) {
                Editor.log('updata asset!');
                deletePreviousPiPiXia(deletePiPiXia);
            }
        );
    });
}
/**
 * 删除旧数据
 * @param {*} pipixiaArr
 */
async function deletePreviousPiPiXia(pipixiaArr) {
    Editor.log('获得需要删除的皮皮虾数据===>', pipixiaArr);
    function delPath(path) {
        // if (path.indexOf('./') !== 0 || path.indexOf('../') !== 0) {
        //     return console.log("为了安全仅限制使用相对定位..");
        // }
        if (!Fs.existsSync(path)) {
            console.log('路径不存在');
            return '路径不存在';
        }
        var info = Fs.statSync(path);
        if (info.isDirectory()) {
            //目录
            var data = Fs.readdirSync(path);
            if (data.length > 0) {
                for (var i = 0; i < data.length; i++) {
                    delPath(`${path}/${data[i]}`); //使用递归
                    if (i == data.length - 1) {
                        //删了目录里的内容就删掉这个目录
                        delPath(`${path}`);
                    }
                }
            } else {
                console.log('删除空目录');
                Fs.rmdirSync(path); //删除空目录
            }
        } else if (info.isFile()) {
            console.log('删除文件');
            Fs.unlinkSync(path); //删除文件
        }
    }
    for (let i = 0; i < pipixiaArr.length; i++) {
        if (pipixiaArr[i] != undefined) {
            delPath(pathData.join(ConfigManager.get().pipixiaPath + '/' + pipixiaArr[i] + '.txt'));
        }
        // deletePiPiXia.push(pathData.json(pipixiaData + "/" + data + ".txt"));
    }
    // delPath("D:\\v2rayw");  //确认路径。__ 。没有后悔药
    let pipixiaData = ConfigManager.get().pipixiaPath;
    let pipixiaUrl = pipixiaData.split('assets');
    Editor.assetdb.refresh(
        'db://assets/' + pathData.join(pipixiaUrl[pipixiaUrl.length - 1]),
        function (err, results) {
            Editor.log('<===remove the end===>');
            Editor.log('updata asset!');
        }
    );
}
