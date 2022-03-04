// panel/index.js
Editor.Panel.extend({
  style: `
    :host { margin: 5px; }
    h2 { color: #f90; }
  `,

  template: `

  <div class="wrapper">
  <ui-box-container>
  <!-- 一些标签元素 -->
  <ui-prop id="cookie" name="登录cookie:" type="string">
      <ui-input></ui-input>
  </ui-prop>
  <ui-prop id="keycourse" name="课件id:" type="string">
      <ui-input></ui-input>
  </ui-prop>
  <ui-prop id="pipixia" name="pipixia配置存放路径:" type="string">
      <ui-input></ui-input>
  </ui-prop>
  <ui-prop id="chapter" name="岛配置文件路径" type="string">
      <ui-input></ui-input>
  </ui-prop>
  </ui-box-container>
  </div>
  <br>
  <br>
  <div class="layout horizontal center-justified">
  <ui-button id="cookiebtn" "class="green">修改登录cookie</ui-button>
  <ui-button id="pipixiabtn" "class="green">修改pipixia配置路径</ui-button>
  <ui-button id="chapterbtn" "class="green">修改岛配置路径</ui-button>
  <ui-button id="submitbtn" "class="green">开始修改岛配置</ui-button>
  </div>
  <div><span id="label"></span></div>
  `,
  $: {
    submitbtn: '#submitbtn',//提交按钮
    cookie: "#cookie",//用户秘钥
    cookiebtn: "#cookiebtn",//修改秘钥按钮
    pipixia: "#pipixia",//
    pipixiabtn: "#pipixiabtn",//修改皮皮虾配置路径按钮
    chapter: "#chapter",
    chapterbtn: "#chapterbtn",//修改岛配置按钮
    keycourse: "#keycourse",//课程id
    label: '#label',
  },
  ready() {
    Editor.Ipc.sendToMain("pipixia-automatic-configuration:initpanel");
    //登录id
    this.$cookiebtn.addEventListener('confirm', () => {
      Editor.Ipc.sendToMain("pipixia-automatic-configuration:setData", { type: "cookie", data: this.$cookie.value });
    });
    //皮皮虾文件路径配置
    this.$pipixiabtn.addEventListener('confirm', () => {
      Editor.Ipc.sendToMain("pipixia-automatic-configuration:setData", { type: "pipixia", data: this.$pipixia.value });
    });
    //岛路径配置
    this.$chapterbtn.addEventListener('confirm', () => {
      Editor.Ipc.sendToMain("pipixia-automatic-configuration:setData", { type: "chapter", data: this.$chapter.value });
    });
    //提交按钮
    this.$submitbtn.addEventListener('confirm', () => {
      this.$label.innerText = "少女祈祷中...";
      setTimeout(() => {
        this.$label.innerText = '';
      }, 1500);
      Editor.Ipc.sendToMain("pipixia-automatic-configuration:click", this.$keycourse.value);
    });

  },
  messages: {
    "initDatas": function (event, data) {
      var arr = [];
      for (let k in data) {
        arr.push(data[k]);
      }
      this.$cookie.value = arr[1];
      this.$pipixia.value = arr[2];
      this.$chapter.value = arr[0];
    }
  },
});