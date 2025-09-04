// formulaWorker.js

// 接收主线程消息
self.onmessage = function(e) {
    const { formulas, sheetIndex } = e.data;
    const formulaObjects = {};
    const formulaCache = {};
    const total = formulas.length;
    let count = 0;

    // 构建公式对象
    formulas.forEach(cell => {
        const key = `r${cell.r}c${cell.c}i${cell.index}`;
        const formulaStr = cell.formulaStr;
        let formulaArray = formulaCache[formulaStr];
        if (!formulaArray) {
            formulaArray = cell.getFormulaRanges(formulaStr); // Worker 内自己提供解析方法
            formulaCache[formulaStr] = formulaArray;
        }

        formulaObjects[key] = {
            key,
            r: cell.r,
            c: cell.c,
            index: cell.index,
            formulaStr,
            formulaArray,
            parents: {},
            children: {},
            color: "w"
        };
    });

    // 建立依赖关系
    Object.values(formulaObjects).forEach(f => {
        f.formulaArray.forEach(range => {
            for (let r = range.row[0]; r <= range.row[1]; r++) {
                for (let c = range.column[0]; c <= range.column[1]; c++) {
                    const childKey = `r${r}c${c}i${range.sheetIndex}`;
                    if (formulaObjects[childKey]) {
                        f.children[childKey] = 1;
                        formulaObjects[childKey].parents[f.key] = 1;
                    }
                }
            }
        });
    });

    // 拓扑排序（深度优先）
    const formulaRunList = [];
    const visited = {};
    const stack = Object.values(formulaObjects);

    while (stack.length > 0) {
        const f = stack.pop();
        if (!f || visited[f.key]) continue;

        const parents = Object.keys(f.parents).map(k => formulaObjects[k]).filter(p => p);
        if (parents.length === 0) {
            formulaRunList.push(f);
            visited[f.key] = true;
        } else {
            stack.push(f);
            stack.push(...parents);
        }
    }

    const uniqueRunList = Array.from(new Set(formulaRunList)).reverse();

    // 计算公式
    const resultData = {};
    uniqueRunList.forEach((f, i) => {
        // Worker 内不执行原来的 execfunction，需要主线程提供函数或简单模拟
        const value = null; // 这里只模拟，实际可以用自定义计算逻辑
        resultData[`${f.r}_${f.c}_${f.index}`] = { v: value, f: f.formulaStr };

        // 每 10% 或固定数量回传一次进度
        if ((i + 1) % Math.ceil(uniqueRunList.length / 10) === 0) {
            self.postMessage({ type: 'progress', progress: ((i + 1) / uniqueRunList.length * 100).toFixed(0) });
        }
    });

    // 计算完成
    self.postMessage({ type: 'done', data: resultData });
};
