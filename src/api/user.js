import request from '@/utils/request'

/**
 * 根据ID获取图表数据
 * @param {number | string} entityId - 从3D场景中传递过来的实体ID
 * @returns {Promise}
 */
export function getChartData(entityId) { // ✨ 1. 给参数起一个更明确的名字，避免混淆
    return request({
        // ✨ 2. 使用模板字符串正确地将参数拼接到URL中
        url: `/entities/${entityId}`,
        method: 'get'
    })
}