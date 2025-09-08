<template>

  <!-- 使用 Element Plus 的栅格系统 -->
  <el-row class="container">
    <!-- 左侧1/3容器 -->
    <el-col :span="10" class="left-panel">
      <div class="panel-content">
        <div class="attribute-panel">
          <!-- name 高亮显示（独立显示） -->
          <div v-if="localChartData.attributes.name" class="attribute-item name-highlight">
            <div class="attribute-value">{{ localChartData.attributes.name }}</div>
          </div>

          <!-- 用 template 包装 v-for 和 v-if -->
          <template v-for="(value, key) in localChartData.attributes" :key="key">
            <div class="attribute-item" v-if="key !== 'id' && key !== 'name'">
              <div class="attribute-key">{{ key }}</div>
              <div class="attribute-value">{{ value }}</div>
            </div>
          </template>
        </div>
      </div>

    </el-col>

    <!-- 右侧2/3容器 -->
    <el-col :span="13" class="right-panel">
      <div ref="chartRef" class="chart-container" style="width: 60vw;height: 92vh;"></div>
    </el-col>
  </el-row>
</template>


<script>
import * as echarts from 'echarts';
import { getChartData } from '../api/user'

export default {
  name: 'Chart',
  props: {
    chartData: {
      type: Object,
      required: true,
      default: () => ({
        nodes: [],
        links: [],
        categories: [],
        attributes: {}
      })
    }
  },
  data() {
    return {
      chart: null,
      localChartData: this.chartData
    };
  },
  watch: {
    // 监听 props 变化，同步到本地数据
    chartData(newVal) {
      this.localChartData = newVal;
    }
  },
  mounted() {
    console.log(this.chartData, 111)
    this.initChart(); // 组件挂载时初始化图表

  },
  methods: {
    getChartOption() {
      return {

        title: {
          text: '关系图',
          textStyle: {
            color: '#7FBFFF',
            fontSize: 25
            // 标题也改为白色（如果需要）
          }
        },
        tooltip: {},
        legend: {
          data: this.localChartData.categories.map(item => item.name),
          textStyle: {
            color: '#fff', // 图例文字白色
            fontSize: 16   // 图例文字放大
          },
          itemWidth: 20,   // 图例标记的图形宽度
          itemHeight: 20,   // 图例标记的图形高度
          itemGap: 15       // 图例每项之间的间隔
        },
        series: [{
          type: 'graph',
          layout: 'force',
          force: {

            repulsion: 900,       // 强斥力
            edgeLength: 280,        // 较短边
            gravity: 0.05,         // 减小中心引力
            friction: 0.3,         // 可略调高
            layoutAnimation: true, // 保证动画布局生效

            // 添加位置初始化参数
            initPositions: function () {
              // 在中心区域随机初始化位置
              const positions = [];
              const width = this.api.getWidth();
              const height = this.api.getHeight();

              for (let i = 0; i < this.nodes.length; i++) {
                positions.push([
                  width / 2 + (Math.random() - 0.5) * width * 0.3, // X坐标在中心±15%范围
                  height / 2 + (Math.random() - 0.5) * height * 0.3 // Y坐标在中心±15%范围
                ]);
              }
              return positions;
            }
          },
          roam: true,
          data: this.localChartData.nodes,
          links: this.localChartData.links.map(link => ({
            ...link,
            label: {
              show: true,
              formatter: link.label,
              color: '#fff' // 边标签文字白色
            },
          })),
          categories: this.localChartData.categories,

          label: {
            show: true,
            formatter: '{b}',
            fontSize: 18,
            color: '#fff' // 节点标签白色
          },
          edgeLabel: {
            show: true,
            formatter: '{@label}',
            fontSize: 16,
            color: '#fff', // 边标签文字白色
            opacity: 1,    // 强制不透明（关键！）

          },
          lineStyle: {
            width: 3,
            color: 'source',
            curveness: 0.2
          },
          edgeSymbol: ['none', 'arrow'],
          //symbolSize: 20 // 节点图形大小（可选放大）
        }],
        on: {
          finished: function () {
            // 确保节点在中心区域
            this.dispatchAction({
              type: 'graphRoam',
              zoom: 1,
              originX: 0,
              originY: 0
            });
          }
        }
      };

    },
    initChart() {
      // 1. 初始化 ECharts 实例
      this.chart = echarts.init(this.$refs.chartRef);
      this.chart.setOption(this.getChartOption());
      this.chart.on('click', (params) => {
        // 仅处理节点点击（过滤边或其他元素的点击）
        if (params.componentType === 'series' && params.seriesType === 'graph' && params.dataType === 'node') {
          console.log('点击了节点：', params.data.id);
          getChartData(params.data.id).then(res => {


            this.localChartData = res
            console.log(this.localChartData)
            this.refreshChart(); // 调用刷新图表的方法

          })

        }
      });
    },
    refreshChart() {
      this.chart.setOption(this.getChartOption(), true); // 复用配置方法
    }
  }

}
</script>

<style scoped>
/* 仅修改字号和颜色 */
.attribute-form,
.attribute-form :deep(.el-form-item__label),
.attribute-form :deep(.el-form-item__content) {
  font-size: 20px !important;
  color: white !important;
}

/* 容器样式 */
.container {
  width: 94%;
  height: 90vh;
  /* 保持高度与原来一致 */
  margin: 0 !important;
  /* 覆盖 Element 默认边距 */
}

/* 左侧面板样式 */
.left-panel {
  height: 100%;
  padding-left: 20px;

  border-right: 2px solid #e6e6e6;
  border-bottom: none;
  /* 允许内容滚动 */
  margin: 0%;
}

.panel-content {
  height: 100%;
}

/* 右侧图表容器 */
.right-panel {
  height: 100%;
  padding: 0;
}

.chart-container {
  width: 100%;
  height: 100%;
}



/* 响应式调整 */
@media (max-width: 992px) {
  .el-col {
    width: 100% !important;
  }

  .left-panel {
    height: auto;
    border-right: none;
    border-bottom: 1px solid #e6e6e6;
  }
}

/* 这里开始改的*/
.attribute-panel {
  font-family: "SimSun", serif;
  display: flex;
  flex-direction: column;
  gap: 24px;


  padding-right: 12px;

  /* ✅ 左侧加宽 */
  color: #ffffff;

  font-size: 18px;
  /* ✅ 整体放大 */
}



/* 每组项之间距离 */
.attribute-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* key 用圆角边框强调 */
.attribute-key {
  display: inline-block;
  padding: 6px 14px;
  border: 3px solid #7FBFFF;
  border-radius: 18px;
  font-size: 20px;
  font-weight: 600;
  color: #c1e0ff;
  width: fit-content;

}

/* value 字体白色更大 */
.attribute-value {
  font-size: 22px;
  color: #ffffff;
  padding-left: 2px;
  line-height: 1.6;
  text-indent: 2em;
  /* ✅ 开头缩进两字符 */
}

/* name 高亮 */
.name-highlight .attribute-value {
  text-align: center;
  font-size: 35px;
  /* ✅ 更大字号 */
  font-weight: bold;

  color: #c9dcef;
  border-bottom: 2px dashed #7FBFFF;
  padding-bottom: 8px;
  margin-bottom: 10px;
  text-indent: 0em;

}
</style>