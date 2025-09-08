<template>
    <div class="home-container">
        <!-- 3D画布，引擎将在这里工作 -->
        <div ref="threeContainer" class="three-canvas"></div>
        <div class="crosshair" v-if="isLocked"></div> <!-- 添加准星 -->

         <!-- 交互提示UI -->
        <div id="blocker" v-if="!isLocked" @click="startEngine">
            <div id="instructions">
                <p style="font-size:36px">点击屏幕进入场景</p>
                <p>
                    使用 W, A, S, D 键移动<br/>
                    移动鼠标控制方向<br/>
                    将准星对准物体，按 E 键交互<br/>
                    按 ESC 键退出
                </p>
            </div>
        </div>
        
        
        <!-- 知识图谱弹窗 -->
        <el-dialog :destroy-on-close="true" v-model="dialogTableVisible" title="相关知识图谱" :fullscreen="true"
                 class="fullscreen-dialog" @close="handleDialogClose">
            <div>
                <Chart :chartData="chartData" class="chart"></Chart>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import Chart from '../components/Chart.vue'
import { getChartData } from '../api/user'
// 导入新建的引擎类
import Engine from '@/three/Engine.js'
import { convertToChartData } from '@/utils/dataTransformer.js'

export default {
    components: {
        Chart
    },
    data() {
        return {
            dialogTableVisible: false,
            chartData: {},
            isLocked: false // 用于控制提示UI的显示
        }
    },
    async mounted() {
        if (this.$refs.threeContainer) {
            this.engine = new Engine(this.$refs.threeContainer);

            // 等待引擎的 init 方法完成它的所有异步工作
            await this.engine.init();

            // 监听引擎控制器的状态变化
            this.engine.controls.addEventListener('lock', () => {
                this.isLocked = true;
            });
            this.engine.controls.addEventListener('unlock', () => {
                this.isLocked = false;
            });

            this.engine.onClick((id) => {
                this.handleClick(id);
            });
        }
    },
    methods: {
        // 用来响应UI点击
        startEngine() {
            if (this.engine) {
              // 创建一个 public 方法来重置状态
                this.engine.resetPlayerState();
                this.engine.controls.lock();
            }
        },
        handleDialogClose() {
            // 短暂延迟后重新锁定，给UI一个响应时间，体验更好
            setTimeout(() => {
                this.engine.controls.lock();
            }, 100);
        },
        handleClick(id) {
            //this.$message.success(`查询ID为 ${id} 的实体`);

            // 2. 调用API，获取后端原始数据
            getChartData(id).then(originalData => {
              const transformedResult = convertToChartData(originalData);
              console.log("✔️ 转换函数的完整返回值:", transformedResult);

              // 3. 使用转换函数进行“翻译”
              const finalChartData = transformedResult.chartData[0];

              // 4. 将最终处理好的数据交给Vue的data
              this.dialogTableVisible = true;
              this.chartData = finalChartData;

            }).catch(error => {
              // ✨ 添加错误处理，方便调试
              console.error("❌ 请求或处理数据时发生错误:", error);
              this.$message.error("获取数据失败，请检查控制台！");
            });
      }
    }
}
</script>

<style scoped>
/*提示UI的样式 */
#blocker {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
}

#instructions {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    font-size: 14px;
    cursor: pointer;
    color: white;
}

.three-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
}

:deep(.fullscreen-dialog .el-dialog__headerbtn),
:deep(.fullscreen-dialog .el-dialog__headerbtn .el-dialog__close) {
    color: white !important;
    font-size: 20px !important;
}

:deep(.fullscreen-dialog .el-dialog__headerbtn svg) {
    color: white !important;
    font-size: 20px !important;
    fill: currentColor !important;
}

:deep(.fullscreen-dialog.el-dialog) {
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    margin: 0 !important;
    top: 0 !important;
    left: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
}

:deep(.el-dialog) {
    background: transparent !important;
}

:deep(.el-dialog__header),
:deep(.el-dialog__body) {
    background: transparent !important;
}
.crosshair {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 10px;
    border: 1px solid white;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none; /* 让鼠标事件穿透它 */
}
</style>