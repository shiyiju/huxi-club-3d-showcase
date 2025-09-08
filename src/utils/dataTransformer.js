/**
 * 通用数据转换方法：将原始实体关系数据转为指定的图表数据格式
 * @param {Object} originalData - 原始数据（包含entity、relationships、relatedEntities等结构）
 * @returns {Object} 转换后的图表数据（符合目标格式）
 */
export function convertToChartData(originalData) {
    // 步骤1：初始化基础变量
    const nodeMap = new Map(); // 存储节点id与转换后id的映射（原始id → 新id）
    const nodes = [];
    const links = [];
    const categoriesSet = new Set(); // 用于去重分类


    // 步骤2：处理主节点（核心实体）
    const mainEntity = originalData.entity;
    const mainNodeId = 0; // 主节点固定id为0
    const mainNode = {
        id: mainNodeId,
        name: mainEntity.properties.name,
        symbolSize: 100,
        category: "主节点"
    };
    nodes.push(mainNode);
    nodeMap.set(mainEntity.id, mainNodeId); // 映射原始主节点id到0
    categoriesSet.add("主节点"); // 添加主节点分类


    // 步骤3：处理关联节点（relatedEntities中的所有节点）
    let relatedNodeIndex = 1; // 关联节点从1开始编号
    // 遍历所有关系类型（如"参与"、"包含"等）
    Object.keys(originalData.relatedEntities).forEach(relationType => {
        const entities = originalData.relatedEntities[relationType];
        entities.forEach(entity => {
            // 避免重复添加同一节点（通过原始id判断）
            if (!nodeMap.has(entity.id)) {
                const node = {
                    id: relatedNodeIndex,
                    name: entity.properties.name,
                    symbolSize: 75,
                    category: entity.type || "默认分类" // 以实体类型作为分类
                };
                nodes.push(node);
                nodeMap.set(entity.id, relatedNodeIndex); // 记录映射关系
                categoriesSet.add(entity.type || "默认分类"); // 添加分类
                relatedNodeIndex++; // 索引自增
            }
        });
    });


    // 步骤4：处理关系链路（links）
    originalData.relationships.forEach(relation => {
        // 从映射表中获取源节点和目标节点的新id
        const sourceNewId = nodeMap.get(relation.sourceNodeId);
        const targetNewId = nodeMap.get(relation.targetNodeId.toString()); // 兼容数字/字符串id

        if (sourceNewId !== undefined && targetNewId !== undefined) {
            links.push({
                source: sourceNewId.toString(), // 转为字符串避免类型问题
                target: targetNewId.toString(),
                label: relation.type // 链路标签为关系类型（如"参与"）
            });
        }
    });


    // 步骤5：处理分类（categories）
    const categories = Array.from(categoriesSet).map(categoryName => ({
        name: categoryName
    }));


    // 步骤6：处理属性（attributes）
    const attributes = {
        name: originalData.properties.name,
        description: originalData.properties.description,
        // 保留原始属性中的其他字段（如id、category等）
        ...originalData.properties
    };


    // 步骤7：返回最终结构
    return {
        chartData: [
            {
                id: 1, // 图表数据唯一标识（可根据需求改为动态）
                nodes,
                links,
                categories,
                attributes
            }
        ]
    };
}