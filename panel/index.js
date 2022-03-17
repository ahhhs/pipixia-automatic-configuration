// panel/index.js

const Fs = require('fire-fs');
const Path = require('fire-path');
let eventValue = 0;
Editor.Panel.extend({
    style: `
    :host { margin: 5px; }
    h2 { color: #f90; }
  `,

    // template: Fs.readFileSync(
    //     Editor.url('packages://pipixia-automatic-configuration/panel/index.html'),
    //     'utf-8'
    // ),

    template: Fs.readFileSync(
        Editor.url('packages://pipixia-automatic-configuration/panel/index.html'),
        'utf-8'
    ),

    $: {
        submitbtn: '#submitbtn', //提交按钮
        cookie: '#cookie', //用户秘钥
        cookiebtn: '#cookiebtn', //修改秘钥按钮
        pipixia: '#pipixia', //
        pipixiabtn: '#pipixiabtn', //修改皮皮虾配置路径按钮
        chapter: '#chapter',
        chapterbtn: '#chapterbtn', //修改岛配置按钮
        keycourse: '#keycourse', //课程id
        label: '#label',
        optionbox: '#optionbox', //双版本选项
        num: 'ui-num-input', //选项框
    },
    ready() {
        new window.Vue({
            el: this.shadowRoot,
            data: {
                itemCount: [],
            },
            nextIndex: 0,
            methods: {
                //监听光标离开
                onConfirm(event) {
                    const arrValue = parseInt(event.target._value);
                    //如果传进来的数,比原数组大,说明是新增的,
                    if (arrValue > this.itemCount.length || this.itemCount.length == 0) {
                        let index = arrValue - this.itemCount.length;
                        for (let i = 0; i < index; i++) {
                            this.itemCount.push({ id: this.nextIndex++, value: '' });
                        }
                    } else if (arrValue < this.itemCount.length) {
                        let index = this.itemCount.length - arrValue;
                        for (let i = 0; i < index; i++) {
                            this.itemCount.pop();
                        }
                    }
                },
                onChangeId(event) {
                    Editor.log('id');
                    for (let i in event.target) {
                        Editor.log('你妈:', i);
                        Editor.log('你妈:', event.target[i]);
                        Editor.log('你妈0000000');
                    }
                    Editor.log('查看:', event.target.name);
                },
                onChangeLevel(event) {
                    Editor.log('level', event.detail);
                },
                onChangeName(event) {
                    Editor.log('name', event.detail);
                },
            },
        });

        Editor.Ipc.sendToMain('pipixia-automatic-configuration:initpanel');
        //登录id
        this.$cookiebtn.addEventListener('confirm', () => {
            Editor.Ipc.sendToMain('pipixia-automatic-configuration:setData', {
                type: 'cookie',
                data: this.$cookie.value,
            });
        });
        //皮皮虾文件路径配置
        this.$pipixiabtn.addEventListener('confirm', () => {
            Editor.Ipc.sendToMain('pipixia-automatic-configuration:setData', {
                type: 'pipixia',
                data: this.$pipixia.value,
            });
        });
        //岛路径配置
        this.$chapterbtn.addEventListener('confirm', () => {
            Editor.Ipc.sendToMain('pipixia-automatic-configuration:setData', {
                type: 'chapter',
                data: this.$chapter.value,
            });
        });
        //提交按钮
        this.$submitbtn.addEventListener('confirm', () => {
            this.$label.innerText = '少女祈祷中...';
            setTimeout(() => {
                this.$label.innerText = '';
            }, 1500);
            Editor.Ipc.sendToMain(
                'pipixia-automatic-configuration:click',
                this.$keycourse.value,
                this.$optionbox.checked
            );

            Editor.log('课件s:', this.$demo);
        });
    },
    messages: {
        initDatas: function (event, data) {
            var arr = [];
            for (let k in data) {
                arr.push(data[k]);
            }
            this.$cookie.value = arr[1];
            this.$pipixia.value = arr[2];
            this.$chapter.value = arr[0];
            this.$optionbox.checked = false;
        },
    },
});
