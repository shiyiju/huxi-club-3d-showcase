# 安装环境打开页面
下载nodejs，下载npm(我的版本npm10.8.2，nodejs20.19.4)
在文件夹根目录使用终端运行npm install
运行npm run dev
如果报错，缺什么装什么注意如果是装json server，安装0.17.4版本，检查版本兼容性
运行成功后即可在网页中打开

# 运行json server模拟后端查看效果
运行npx json-server mock/db.json --routes mock/route.json --port 8082
随后输入1点击按钮，会弹出一个示例的介绍和关系图
（该做法仅作模拟示例，因此只设计了ID为1一种，其他会出错，连上后端后就好了）

# 链接后端
关闭json server(如果没有上一步的运行，则不需要关闭)
输入id点击按钮后会调用后端接口。完整路径是http://localhost:8082/api/getChartData/id(其中id是输入的数字，是get请求)
后端需要完成能根据输入的id，返回要求格式的数据，具体数据示例见mock-db.json文件
后端不需要修改这个包中任何内容

# 接入3D
在src/views/Home.vue,将特定内容（已标出）改成相应的3D背景，并把点击事件的绑定到3D模型中

# 3d引擎
在src/three/Engine.js，处理所有3d相关逻辑
public/scene.json,为场景模型文件，后期完善好模型直接替换新的scene.json即可
需要交互的实体都会有一个专有ID在three.js editor中设置，每个ID返回对应数据，目前只有椅子ID为1