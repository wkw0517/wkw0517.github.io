// 全局变量
let currentInequality1; // 含参不等式
let currentInequality2; // 不含参不等式
let paramA = 1; // 初始参数值
let isDragging = false;
let dragTarget = null;
let dragStartX = 0;
let dragStartPos = 0;
const NUMBER_LINE_DISPLAY_RANGE = 20; // 数轴总共显示的数值范围

// 新增：用于参数a触摸调整的全局变量
let isAdjustingParamTouch = false;
let touchStartParamY = 0;
let initialParamAOnTouch = 0;

// 页面加载后执行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化事件监听
    document.getElementById('generateBtn').addEventListener('click', generateInequalities);
    
    // 添加滚轮事件来调整参数a
    document.addEventListener('wheel', handleParamWheel, { passive: false });

    // 新增：为参数控制区域添加触摸事件监听，用于调整参数a
    const paramControlArea = document.querySelector('.parameter-control');
    if (paramControlArea) {
        paramControlArea.addEventListener('touchstart', handleParamTouchStart, { passive: false });
        document.addEventListener('touchmove', handleParamTouchMove, { passive: false });
        document.addEventListener('touchend', handleParamTouchEnd);
    }
    
    // 生成初始不等式组
    generateInequalities();
});

// 使用滚轮调整参数a
function handleParamWheel(event) {
    // 阻止默认滚动行为
    event.preventDefault();
    
    // 更精细的控制
    // 检查是否按住Ctrl键（更精细的控制）
    let stepBase = event.ctrlKey ? 0.1 : 0.5;
    
    // 根据滚动速度调整步长，使变化更平滑
    let step = stepBase * Math.min(Math.abs(event.deltaY) / 100, 1);
    if (step < 0.05) step = 0.05; // 最小步长
    
    // 向上滚动增加参数值，向下滚动减少参数值
    if (event.deltaY < 0) {
        paramA += step;
    } else {
        paramA -= step;
    }
    
    // 对参数a进行取值精确化，避免过多小数位
    paramA = Math.round(paramA * 100) / 100;
    
    // 更新显示
    document.getElementById('paramAValue').textContent = paramA.toFixed(2);
    
    // 更新不等式和解集
    updateInequalities();
}

// 新增：处理参数a触摸开始
function handleParamTouchStart(event) {
    if (event.touches.length === 1) { // 单指触摸
        isAdjustingParamTouch = true;
        touchStartParamY = event.touches[0].clientY;
        initialParamAOnTouch = paramA; // 记录开始触摸时的参数值
        event.preventDefault(); // 阻止可能的默认行为，如文本选择或滚动
    }
}

// 新增：处理参数a触摸滑动
function handleParamTouchMove(event) {
    if (!isAdjustingParamTouch || event.touches.length !== 1) return;

    event.preventDefault(); // 在调整参数时阻止页面滚动

    const currentY = event.touches[0].clientY;
    const deltaY = touchStartParamY - currentY; // 向上滑动为正，对应参数增加

    // 调整灵敏度：每滑动 N像素 改变参数值1个单位 (或0.1等)
    // 这里设定滑动50像素改变参数0.5（与滚轮默认步长相似）
    const sensitivityFactor = 50 / 0.5; 
    const changeInParamA = deltaY / sensitivityFactor;

    let newParamA = initialParamAOnTouch + changeInParamA;
    newParamA = Math.round(newParamA * 100) / 100; // 精确到两位小数

    // 实时更新，但不立即将 newParamA 赋值给全局 paramA，
    // 而是先更新UI，在touchend时再最终确定值。
    // 或者，可以像滚轮一样实时更新全局paramA并调用updateInequalities。
    // 为了与滚轮行为一致，我们选择实时更新。

    if (paramA !== newParamA) { // 只有值变化时才更新
        paramA = newParamA;
        document.getElementById('paramAValue').textContent = paramA.toFixed(2);
        updateInequalities();
    }
}

// 新增：处理参数a触摸结束
function handleParamTouchEnd() {
    if (isAdjustingParamTouch) {
        isAdjustingParamTouch = false;
        // 可以在这里进行最终的更新，但如果touchmove中已实时更新，则此步可省略或用于其他逻辑
        // updateInequalities(); // 如果touchmove中没有实时更新，则在这里更新
    }
}

// 更新不等式和解集的显示
function updateInequalities() {
    // 显示原始不等式
    displayOriginalInequalities();
    
    // 计算整数解并更新数轴 (原calculateAndDisplaySolution的部分功能)
    calculateIntegerSolutionsForNumberLine(); 
    
    // 更新数轴
    updateNumberLine();
}

// 显示原始不等式
function displayOriginalInequalities() {
    const originalDiv = document.getElementById('originalInequality');
    
    // 使用自定义不等式显示
    const ineq1 = currentInequality1.customDisplay;
    const ineq2 = currentInequality2.customDisplay;
    
    originalDiv.innerHTML = `
        <div class="color-inequality1">${ineq1}</div>
        <div class="color-inequality2">${ineq2}</div>
    `;
}

// 构建不等式字符串
function buildInequalityString(inequality, isFirst) {
    let result = '';
    
    if (inequality.hasParam) {
        // 含参不等式
        result += `<span class="color-param">a</span>x`;
    } else {
        // 不含参不等式
        result += `${inequality.a}x`;
    }
    
    if (inequality.b > 0) {
        result += ` + ${inequality.b}`;
    } else if (inequality.b < 0) {
        result += ` - ${Math.abs(inequality.b)}`;
    }
    
    result += inequality.isLessThan ? ' &lt; ' : ' &gt; ';
    result += `${inequality.c}`;
    
    return result;
}

// 构建化简后不等式字符串
function buildSimplifiedInequalityString(inequality, isFirst) {
    let result = '';
    
    if (inequality.hasParam) {
        // 含参不等式转换为 x 与 a 的关系形式
        if (paramA === 0) {
            // 当a=0时特殊处理
            const leftSide = inequality.b;
            const rightSide = inequality.c;
            const isAlwaysTrue = (inequality.isLessThan && leftSide < rightSide) || (!inequality.isLessThan && leftSide > rightSide);
            return isAlwaysTrue ? "恒成立" : "恒不成立";
        } else {
            // 计算常数项
            const constant = (inequality.c - inequality.b) / paramA;
            
            // 如果a是负数，需要反转不等号
            let isLessThan = inequality.isLessThan;
            if (paramA < 0) {
                isLessThan = !isLessThan;
            }
            
            // 代数式表示：如果常数为0，直接显示x>a或x<a
            if (constant === 0) {
                return `x ${isLessThan ? '&lt;' : '&gt;'} <span class="color-param">a</span>`;
            } else if (constant > 0) {
                return `x ${isLessThan ? '&lt;' : '&gt;'} <span class="color-param">a</span> + ${constant}`;
            } else {
                return `x ${isLessThan ? '&lt;' : '&gt;'} <span class="color-param">a</span> - ${Math.abs(constant)}`;
            }
        }
    } else {
        // 不含参不等式，尝试简化为整数形式
        let rightValue = (inequality.c - inequality.b) / inequality.a;
        let isLessThan = inequality.isLessThan;
        
        // 如果a是负数，需要反转不等号
        if (inequality.a < 0) {
            isLessThan = !isLessThan;
        }
        
        // 检查是否为整数
        if (Number.isInteger(rightValue)) {
            return `x ${isLessThan ? '&lt;' : '&gt;'} ${rightValue}`;
        } else {
            // 如果不是整数，四舍五入到两位小数
            const roundedValue = Math.round(rightValue * 100) / 100;
            return `x ${isLessThan ? '&lt;' : '&gt;'} ${roundedValue}`;
        }
    }
}

// 计算整数解并准备用于数轴的数据
function calculateIntegerSolutionsForNumberLine() {
    const integerSolutionsDiv = document.getElementById('integerSolutions');

    // 获取不等式边界和严格性
    const boundaryN = currentInequality2.c;
    const isLessThanN = currentInequality2.isLessThan;
    const isStrictN = currentInequality2.strictInequality === true;

    const paramBoundary = paramA + currentInequality1.constant;
    const isLessThanParam = currentInequality1.isLessThan;
    const isStrictParam = currentInequality1.strictInequality === true;

    // --- 计算最终解集区间 ---
    let min1 = -Infinity, max1 = Infinity;
    let min1Strict = false, max1Strict = false;
    if (isLessThanParam) {
        max1 = paramBoundary;
        max1Strict = isStrictParam;
    } else {
        min1 = paramBoundary;
        min1Strict = isStrictParam;
    }

    let min2 = -Infinity, max2 = Infinity;
    let min2Strict = false, max2Strict = false;
    if (isLessThanN) {
        max2 = boundaryN;
        max2Strict = isStrictN;
    } else {
        min2 = boundaryN;
        min2Strict = isStrictN;
    }

    let finalStart = Math.max(min1, min2);
    let finalEnd = Math.min(max1, max2);
    
    let finalStartStrict = false;
    if (finalStart === min1 && finalStart === min2) { 
        finalStartStrict = min1Strict || min2Strict;
    } else if (finalStart === min1) { 
        finalStartStrict = min1Strict;
    } else { 
        finalStartStrict = min2Strict;
    }

    let finalEndStrict = false;
    if (finalEnd === max1 && finalEnd === max2) { 
        finalEndStrict = max1Strict || max2Strict;
    } else if (finalEnd === max1) { 
        finalEndStrict = max1Strict;
    } else { 
        finalEndStrict = max2Strict;
    }
    // --- 最终解集区间计算完毕 ---

    const noSolution = (finalStart > finalEnd || (finalStart === finalEnd && (finalStartStrict || finalEndStrict)));

    if (noSolution) {
        integerSolutionsDiv.innerHTML = '整数解：<span class="color-solution">∅ (空集)</span>';
        return;
    }

    // 获取数轴可见范围内的整数，用于示例显示
    const visibleSolutions = [];
    const visibleScanStart = Math.max(finalStart, numberLine.axisParams ? numberLine.axisParams.startValue : -10);
    const visibleScanEnd = Math.min(finalEnd, numberLine.axisParams ? numberLine.axisParams.endValue : 10);

    let scanLoopStart = finalStartStrict ? Math.floor(visibleScanStart) + 1 : Math.ceil(visibleScanStart);
    let scanLoopEnd = finalEndStrict ? Math.ceil(visibleScanEnd) - 1 : Math.floor(visibleScanEnd);
    
    // Refine scanLoopStart and scanLoopEnd to be within the actual intersection for visible part
    scanLoopStart = Math.max(scanLoopStart, finalStartStrict ? Math.floor(finalStart) + 1 : Math.ceil(finalStart));
    scanLoopEnd = Math.min(scanLoopEnd, finalEndStrict ? Math.ceil(finalEnd) - 1 : Math.floor(finalEnd));


    for (let i = scanLoopStart; i <= scanLoopEnd; i++) {
        if (Number.isInteger(i)) {
            // Double check if i is within the actual final interval, considering strictness
            let inFinalInterval = true;
            if (finalStartStrict ? i <= finalStart : i < finalStart) inFinalInterval = false;
            if (finalEndStrict ? i >= finalEnd : i > finalEnd) inFinalInterval = false;
            
            if(inFinalInterval) {
                 // And also check against original inequalities to be absolutely sure
                 let isInSolutionOriginal = true;
                 // Check first inequality
                 if (isLessThanParam) {
                     if (isStrictParam ? (i >= paramBoundary) : (i > paramBoundary)) isInSolutionOriginal = false;
                 } else {
                     if (isStrictParam ? (i <= paramBoundary) : (i < paramBoundary)) isInSolutionOriginal = false;
                 }
                 // Check second inequality
                 if (isInSolutionOriginal) {
                     if (isLessThanN) {
                         if (isStrictN ? (i >= boundaryN) : (i > boundaryN)) isInSolutionOriginal = false;
                     } else {
                         if (isStrictN ? (i <= boundaryN) : (i < boundaryN)) isInSolutionOriginal = false;
                     }
                 }
                 if(isInSolutionOriginal){
                    visibleSolutions.push(i);
                 }
            }
        }
    }
    
    let solutionsListText = '{...}'; // Default for infinite or many solutions
    if (visibleSolutions.length > 0) {
        visibleSolutions.sort((a, b) => a - b);
        const maxShownSolutions = 10; // Reduced for brevity when infinite
        let solutionsToShow = visibleSolutions;
        let indicateMoreInList = false;
        
        if (visibleSolutions.length > maxShownSolutions) {
            solutionsToShow = visibleSolutions.slice(0, maxShownSolutions);
            indicateMoreInList = true;
        }
        solutionsListText = '{' + solutionsToShow.map(x => `<span class="color-integer">${x}</span>`).join(', ') + (indicateMoreInList ? ', ...' : '') + '}';
    } else if (!noSolution && !(finalStart === -Infinity || finalEnd === Infinity) ) {
        // Has solution, is finite, but no visible integers in the scanned range.
        // This means the integers are outside the visible number line, or there are none.
        // Let the finite calculation below determine if it's truly empty for integers.
    }


    const isInfinite = (finalStart === -Infinity || finalEnd === Infinity);

    if (isInfinite) {
        // 如果是无限解，确保列表有省略号 (除非列表为空，比如 x > 1000, 可见区无整数)
        if (visibleSolutions.length > 0 && !solutionsListText.endsWith(', ...}')) {
            if (solutionsListText.endsWith('}')) { // 如果是以 } 结尾，替换为 , ...}
                solutionsListText = solutionsListText.slice(0, -1) + ', ...}';
            } else { // 其他情况，不太可能，但作为保障
                solutionsListText += ', ...'; 
            }
        } else if (visibleSolutions.length === 0 && solutionsListText === '{...}') {
            // 如果可见区没有整数，但理论上有无限解，保持 {...} 或显示更明确的无限提示
            // solutionsListText = '{..., some integers, ...}'; // 这种可能更好，但暂时保持简单
        }
        integerSolutionsDiv.innerHTML = `整数解：${solutionsListText} <br><span class="color-solution">（无数个整数解）</span>`;
    } else {
        // Finite interval: precisely calculate all integer solutions in this interval
        const actualFiniteSolutions = [];
        let loopStart = finalStartStrict ? Math.floor(finalStart) + 1 : Math.ceil(finalStart);
        let loopEnd = finalEndStrict ? Math.ceil(finalEnd) - 1 : Math.floor(finalEnd);

        for (let i = loopStart; i <= loopEnd; i++) {
            if (Number.isInteger(i)) {
                 // Re-check against original inequalities for safety for finite count
                 let isInSolutionOriginal = true;
                 if (isLessThanParam) {
                     if (isStrictParam ? (i >= paramBoundary) : (i > paramBoundary)) isInSolutionOriginal = false;
                 } else {
                     if (isStrictParam ? (i <= paramBoundary) : (i < paramBoundary)) isInSolutionOriginal = false;
                 }
                 if (isInSolutionOriginal) {
                     if (isLessThanN) {
                         if (isStrictN ? (i >= boundaryN) : (i > boundaryN)) isInSolutionOriginal = false;
                     } else {
                         if (isStrictN ? (i <= boundaryN) : (i < boundaryN)) isInSolutionOriginal = false;
                     }
                 }
                 if(isInSolutionOriginal){
                    actualFiniteSolutions.push(i);
                 }
            }
        }
        
        if (actualFiniteSolutions.length > 0) {
            actualFiniteSolutions.sort((a, b) => a - b); // Sort for consistent display
            const maxShownSolutionsFinite = 15;
            let solutionsToShowFinite = actualFiniteSolutions;
            let indicateMoreFinite = false;
            if (actualFiniteSolutions.length > maxShownSolutionsFinite) {
                solutionsToShowFinite = actualFiniteSolutions.slice(0, maxShownSolutionsFinite);
                indicateMoreFinite = true;
            }
            const finiteSolutionsText = '{' + solutionsToShowFinite.map(x => `<span class="color-integer">${x}</span>`).join(', ') + (indicateMoreFinite ? ', ...' : '') + '}';
            
            integerSolutionsDiv.innerHTML = `整数解：${finiteSolutionsText}`;
            if (actualFiniteSolutions.length === 1) {
                integerSolutionsDiv.innerHTML += '<br><span class="color-solution">（唯一解）</span>';
            } else {
                integerSolutionsDiv.innerHTML += `<br><span class="color-solution">（共 ${actualFiniteSolutions.length} 个整数解）</span>`;
            }
        } else {
             // Finite interval, but no integers in it (e.g. 0.1 < x < 0.9)
            integerSolutionsDiv.innerHTML = '整数解：<span class="color-solution">∅ (空集)</span>';
        }
    }
}

// 计算整数解 (此函数现在主要用于数轴上整数点的绘制，实际计数和无限判断在 calculateIntegerSolutionsForNumberLine 中)
// 它的扫描范围 (-100,100) 仅用于在数轴上"抽样"显示整数点，不影响最终解集判断。
function calculateIntegerSolutions(boundary1, isLessThan1, boundary2, isLessThan2) {
    // 获取当前不等式组的严格不等式标志
    const isStrict1 = currentInequality1.strictInequality === true; // 明确使用严格相等
    const isStrict2 = currentInequality2.strictInequality === true; // 明确使用严格相等
    
    // 确定解集范围
    let start = -Infinity;
    let end = Infinity;
    
    // 处理第一个不等式
    if (isLessThan1) {
        end = Math.min(end, boundary1);
    } else {
        start = Math.max(start, boundary1);
    }
    
    // 处理第二个不等式
    if (isLessThan2) {
        end = Math.min(end, boundary2);
    } else {
        start = Math.max(start, boundary2);
    }
    
    // 无解情况
    if (start > end) {
        return [];
    }
    
    // 确定扫描范围(限制在-100到100之间，避免过大范围)
    const scanStart = Math.max(-100, Math.floor(start));
    const scanEnd = Math.min(100, Math.ceil(end));
    
    // 收集解集中的整数
    const integerSolutions = [];
    for (let i = scanStart; i <= scanEnd; i++) {
        let isInSolution = true;
        
        // 检查第一个不等式
        if (isLessThan1) {
            // 小于情况
            if (isStrict1) {
                // 严格小于
                if (i >= boundary1) isInSolution = false;
            } else {
                // 小于等于
                if (i > boundary1) isInSolution = false;
            }
        } else {
            // 大于情况
            if (isStrict1) {
                // 严格大于
                if (i <= boundary1) isInSolution = false;
            } else {
                // 大于等于
                if (i < boundary1) isInSolution = false;
            }
        }
        
        // 检查第二个不等式
        if (isInSolution) {
            if (isLessThan2) {
                // 小于情况
                if (isStrict2) {
                    // 严格小于
                    if (i >= boundary2) isInSolution = false;
                } else {
                    // 小于等于
                    if (i > boundary2) isInSolution = false;
                }
            } else {
                // 大于情况
                if (isStrict2) {
                    // 严格大于
                    if (i <= boundary2) isInSolution = false;
                } else {
                    // 大于等于
                    if (i < boundary2) isInSolution = false;
                }
            }
        }
        
        if (isInSolution) {
            integerSolutions.push(i);
        }
    }
    
    return integerSolutions;
}

// 设置数轴
function setupNumberLine(centerValue) {
    const numberLine = document.getElementById('numberLine');
    numberLine.innerHTML = ''; // 清空现有内容
    
    const startValue = centerValue - NUMBER_LINE_DISPLAY_RANGE / 2;
    const endValue = centerValue + NUMBER_LINE_DISPLAY_RANGE / 2;
    const totalWidth = numberLine.offsetWidth;
    const axisHeight = 60;
    const axisMargin = 40;
    
    // 创建数轴容器
    const axisContainer = document.createElement('div');
    axisContainer.className = 'axis-container';
    axisContainer.style.position = 'relative';
    axisContainer.style.height = '120px';
    axisContainer.style.width = '100%';
    numberLine.appendChild(axisContainer);
    
    // 创建数轴线
    const axisLine = document.createElement('div');
    axisLine.className = 'axis-line';
    axisLine.style.position = 'absolute';
    axisLine.style.top = `${axisHeight}px`;
    axisLine.style.left = `${axisMargin}px`;
    axisLine.style.width = `calc(100% - ${2 * axisMargin}px)`;
    axisLine.style.height = '2px';
    axisLine.style.backgroundColor = '#333';
    axisContainer.appendChild(axisLine);
    
    // 计算刻度间距
    const axisWidth = totalWidth - 2 * axisMargin;
    const valueRange = endValue - startValue; // 这实际上就是 NUMBER_LINE_DISPLAY_RANGE
    const unitWidth = axisWidth / valueRange;
    
    // 创建刻度和标签
    for (let i = startValue; i <= endValue; i++) {
        // 计算位置
        const position = axisMargin + (i - startValue) * unitWidth;
        
        // 创建刻度线
        const tick = document.createElement('div');
        tick.className = 'axis-tick';
        tick.style.position = 'absolute';
        tick.style.top = `${axisHeight - 5}px`;
        tick.style.left = `${position}px`;
        tick.style.width = '1px';
        tick.style.height = '10px';
        tick.style.backgroundColor = '#333';
        tick.style.transform = 'translateX(-0.5px)';
        axisContainer.appendChild(tick);
        
        // 创建刻度标签
        const label = document.createElement('div');
        label.className = 'axis-label';
        label.style.position = 'absolute';
        label.style.top = `${axisHeight + 10}px`;
        label.style.left = `${position}px`;
        label.style.transform = 'translateX(-50%)';
        label.style.fontSize = '12px';
        label.style.color = '#333';
        label.textContent = i;
        axisContainer.appendChild(label);
    }
    
    // 为含参数边界添加可拖动的点
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.id = 'paramBoundary';
    dragHandle.style.position = 'absolute';
    dragHandle.style.width = '20px'; // 增大点击区域
    dragHandle.style.height = '40px'; // 增大点击区域
    dragHandle.style.backgroundColor = 'transparent'; // 完全透明
    dragHandle.style.transform = 'translate(-50%, -50%)';
    dragHandle.style.top = `${axisHeight}px`;
    dragHandle.style.cursor = 'grab';
    dragHandle.style.zIndex = '30'; // 确保在较高的层级
    dragHandle.style.opacity = '0'; // 设置为完全透明
    axisContainer.appendChild(dragHandle);
    
    // 为可拖动点添加事件监听
    dragHandle.addEventListener('mousedown', startDrag);
    dragHandle.addEventListener('touchstart', startDrag, { passive: false });

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
    
    // 保存重要参数为数轴的属性，方便其他函数使用
    numberLine.axisParams = {
        startValue: startValue, // 使用动态计算的值
        endValue: endValue,     // 使用动态计算的值
        axisMargin: axisMargin,
        axisWidth: axisWidth,
        valueRange: valueRange,
        unitWidth: unitWidth,
        axisHeight: axisHeight
    };
}

// 更新数轴上的解集显示
function updateNumberLine() {
    const numberLine = document.getElementById('numberLine');
    const axisContainer = numberLine.querySelector('.axis-container');
    const params = numberLine.axisParams;
    
    if (!params) return; // 如果参数不存在，先退出
    
    // 清除之前的解集显示
    const elementsToRemove = axisContainer.querySelectorAll('.solution-line, .integer-point, .arrow-left, .arrow-right, .interval-marker, .vertical-line, .horizontal-line, .boundary-label, .solution-shadow');
    elementsToRemove.forEach(el => el.remove());
    
    // 获取不含参不等式的边界
    const boundaryN = currentInequality2.c;
    const isLessThanN = currentInequality2.isLessThan;
    const isStrictN = currentInequality2.strictInequality === true;
    
    // 获取含参不等式的边界
    const paramBoundary = paramA + currentInequality1.constant;
    const isLessThanParam = currentInequality1.isLessThan;
    const isStrictParam = currentInequality1.strictInequality === true;
    
    // 打印调试信息，检查严格性判断是否正确
    console.log('含参不等式严格性:', currentInequality1.strictInequality, isStrictParam);
    console.log('不含参不等式严格性:', currentInequality2.strictInequality, isStrictN);
    
    // 定义不同的颜色用于标注
    const colors = {
        inequality1: '#2196F3', // 蓝色 - 含参不等式
        inequality2: '#FF9800', // 橙色 - 不含参不等式
        solution: '#4CAF50',    // 绿色 - 解集
        integer: '#e91e63'      // 粉色 - 整数解
    };
    
    // 将数学坐标转换为屏幕坐标
    const getScreenX = (mathX) => {
        return params.axisMargin + (mathX - params.startValue) * params.unitWidth;
    };
    
    // 定义视觉参数
    const visualParams = {
        markerSize: 8,           // 端点圆点大小
        integerPointSize: 7,     // 整数解点大小
        verticalLine1Height: 25, // 含参不等式垂直线高度 (原为15)
        verticalLine2Height: 40, // 不含参不等式垂直线高度 (原为25)
        lineThickness: 2,        // 线段粗细
        arrowSize: 6,            // 箭头大小
        labelOffset: 45,         // 标签偏移量 (原为25)
        labelFontSize: 12        // 标签字体大小
    };
    
    // 绘制含参不等式解集
    drawInequality(
        paramBoundary,
        isLessThanParam,
        isStrictParam,
        colors.inequality1,
        visualParams.verticalLine1Height
    );
    
    // 绘制不含参不等式解集
    drawInequality(
        boundaryN,
        isLessThanN,
        isStrictN,
        colors.inequality2,
        visualParams.verticalLine2Height
    );
    
    // 计算并绘制整数解
    const integerSolutions = calculateIntegerSolutions(
        paramBoundary, isLessThanParam,
        boundaryN, isLessThanN
    );
    
    // 绘制整数解点
    integerSolutions.forEach(value => {
        if (value >= params.startValue && value <= params.endValue) {
            const pointX = getScreenX(value);
            
            // 整数解点
            const point = document.createElement('div');
            point.className = 'integer-point';
            point.style.position = 'absolute';
            point.style.top = `${params.axisHeight}px`;
            point.style.left = `${pointX}px`;
            point.style.width = `${visualParams.integerPointSize}px`;
            point.style.height = `${visualParams.integerPointSize}px`;
            point.style.backgroundColor = colors.integer;
            point.style.borderRadius = '50%';
            point.style.transform = 'translate(-50%, -50%)';
            point.style.zIndex = '20';
            point.style.boxShadow = '0 0 4px 2px rgba(233, 30, 99, 0.6)'; // 更明显的发光效果
            axisContainer.appendChild(point);
        }
    });
    
    // --- 开始添加绘制解集阴影的逻辑 ---

    // 1. 含参不等式的解区间 [min1, max1] (或开或闭)
    let min1 = -Infinity, max1 = Infinity;
    let min1Strict = false, max1Strict = false;
    if (isLessThanParam) { // x < val or x <= val
        max1 = paramBoundary;
        max1Strict = isStrictParam;
    } else { // x > val or x >= val
        min1 = paramBoundary;
        min1Strict = isStrictParam;
    }

    // 2. 不含参不等式的解区间 [min2, max2] (或开或闭)
    let min2 = -Infinity, max2 = Infinity;
    let min2Strict = false, max2Strict = false;
    if (isLessThanN) { // x < val or x <= val
        max2 = boundaryN;
        max2Strict = isStrictN;
    } else { // x > val or x >= val
        min2 = boundaryN;
        min2Strict = isStrictN;
    }

    // 计算交集
    let finalStart = Math.max(min1, min2);
    let finalEnd = Math.min(max1, max2);
    
    let finalStartStrict = false;
    if (finalStart === min1 && finalStart === min2) { 
        finalStartStrict = min1Strict || min2Strict;
    } else if (finalStart === min1) { 
        finalStartStrict = min1Strict;
    } else { 
        finalStartStrict = min2Strict;
    }

    let finalEndStrict = false;
    if (finalEnd === max1 && finalEnd === max2) { 
        finalEndStrict = max1Strict || max2Strict;
    } else if (finalEnd === max1) { 
        finalEndStrict = max1Strict;
    } else { 
        finalEndStrict = max2Strict;
    }

    if (!(finalStart > finalEnd || (finalStart === finalEnd && (finalStartStrict || finalEndStrict)))) {
        let shadowLeftScreen = -Infinity, shadowRightScreen = Infinity;

        if (finalStart === -Infinity) {
            shadowLeftScreen = params.axisMargin;
        } else {
            shadowLeftScreen = getScreenX(finalStart);
        }

        if (finalEnd === Infinity) {
            shadowRightScreen = params.axisMargin + params.axisWidth;
        } else {
            shadowRightScreen = getScreenX(finalEnd);
        }
        
        shadowLeftScreen = Math.max(params.axisMargin, shadowLeftScreen);
        shadowRightScreen = Math.min(params.axisMargin + params.axisWidth, shadowRightScreen);

        if (shadowLeftScreen < shadowRightScreen) {
            const shadow = document.createElement('div');
            shadow.className = 'solution-shadow';
            shadow.style.left = `${shadowLeftScreen}px`;
            shadow.style.width = `${shadowRightScreen - shadowLeftScreen}px`;
            shadow.style.top = `${params.axisHeight - 40}px`; // 调整top使其下沿与数轴线对齐
            axisContainer.appendChild(shadow);
        }
    }
    // --- 结束添加绘制解集阴影的逻辑 ---

    // 更新可拖动的参数边界点的位置
    updateDragHandlePosition(paramBoundary);
    
    /**
     * 绘制不等式解集
     * @param {number} boundary 边界点的值
     * @param {boolean} isLessThan 是否为小于类型
     * @param {boolean} isStrict 是否为严格不等式
     * @param {string} color 颜色
     * @param {number} heightOffset 高度偏移
     */
    function drawInequality(boundary, isLessThan, isStrict, color, heightOffset) {
        // 检查边界点是否在可见范围内
        if (boundary >= params.startValue && boundary <= params.endValue) {
            const pointX = getScreenX(boundary);
            
            // 绘制边界点
            const marker = document.createElement('div');
            marker.className = 'interval-marker';
            marker.style.position = 'absolute';
            marker.style.top = `${params.axisHeight}px`;
            marker.style.left = `${pointX}px`;
            marker.style.width = `${visualParams.markerSize}px`;
            marker.style.height = `${visualParams.markerSize}px`;
            marker.style.borderRadius = '50%';
            marker.style.transform = 'translate(-50%, -50%)';
            marker.style.backgroundColor = isStrict ? 'white' : color; // 严格不等式用空心圆
            marker.style.border = `${visualParams.lineThickness/2}px solid ${color}`;
            marker.style.zIndex = '5';
            marker.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
            axisContainer.appendChild(marker);
            
            // 绘制边界标签
            const label = document.createElement('div');
            label.className = 'boundary-label';
            label.style.position = 'absolute';
            label.style.bottom = `${params.axisHeight + visualParams.labelOffset}px`;
            label.style.left = `${pointX}px`;
            label.style.transform = 'translateX(-50%)';
            label.style.fontSize = `${visualParams.labelFontSize}px`;
            label.style.color = color;
            label.style.fontWeight = 'bold';
            label.style.textShadow = '0 1px 1px rgba(255,255,255,0.8)';
            
            // 设置标签内容
            if (color === colors.inequality1) {
                // 含参不等式，显示代数式
                const constant = currentInequality1.constant;
                if (constant === 0) {
                    label.innerHTML = '<span class="color-param">a</span>';
                } else if (constant > 0) {
                    label.innerHTML = '<span class="color-param">a</span>+' + constant;
                } else {
                    label.innerHTML = '<span class="color-param">a</span>' + constant;
                }
            } else {
                // 不含参不等式，显示数值
                label.textContent = Number.isInteger(boundary) ? boundary : boundary.toFixed(1);
            }
            axisContainer.appendChild(label);
            
            // 绘制垂直线
            const verticalLine = document.createElement('div');
            verticalLine.className = 'vertical-line';
            verticalLine.style.position = 'absolute';
            verticalLine.style.bottom = `${params.axisHeight}px`;
            verticalLine.style.left = `${pointX}px`;
            verticalLine.style.width = `${visualParams.lineThickness}px`;
            verticalLine.style.height = `${heightOffset}px`;
            verticalLine.style.backgroundColor = color;
            verticalLine.style.transform = 'translateX(-50%)';
            axisContainer.appendChild(verticalLine);
            
            // 根据不等式类型绘制水平线，去掉箭头
            if (isLessThan) {
                // 小于类型，向左延伸
                
                // 水平线 - 从边界点向左延伸到左边界
                const horizontalLine = document.createElement('div');
                horizontalLine.className = 'horizontal-line';
                horizontalLine.style.position = 'absolute';
                horizontalLine.style.bottom = `${params.axisHeight + heightOffset}px`;
                horizontalLine.style.left = `${params.axisMargin}px`;
                horizontalLine.style.width = `${pointX - params.axisMargin}px`;
                horizontalLine.style.height = `${visualParams.lineThickness}px`;
                horizontalLine.style.backgroundColor = color;
                axisContainer.appendChild(horizontalLine);
                
            } else {
                // 大于类型，向右延伸
                
                // 水平线 - 从边界点向右延伸到右边界
                const horizontalLine = document.createElement('div');
                horizontalLine.className = 'horizontal-line';
                horizontalLine.style.position = 'absolute';
                horizontalLine.style.bottom = `${params.axisHeight + heightOffset}px`;
                horizontalLine.style.left = `${pointX}px`;
                horizontalLine.style.width = `${params.axisWidth + params.axisMargin - pointX}px`;
                horizontalLine.style.height = `${visualParams.lineThickness}px`;
                horizontalLine.style.backgroundColor = color;
                axisContainer.appendChild(horizontalLine);
            }
        }
    }
}

// 更新可拖动的参数边界点的位置
function updateDragHandlePosition(boundary) {
    const numberLine = document.getElementById('numberLine');
    const dragHandle = document.getElementById('paramBoundary');
    const params = numberLine.axisParams;
    
    if (!params || !dragHandle) return;
    
    // 将边界限制在可见范围内
    const limitedBoundary = Math.max(params.startValue, Math.min(params.endValue, boundary));
    const screenX = params.axisMargin + (limitedBoundary - params.startValue) * params.unitWidth;
    
    // 只更新位置，保持不可见
    dragHandle.style.display = 'block';
    dragHandle.style.left = `${screenX}px`;
    dragHandle.style.opacity = '0'; // 确保始终不可见
}

// 开始拖动
function startDrag(e) {
    if (e.target.id === 'paramBoundary') {
        isDragging = true;
        dragTarget = e.target;
        // 根据事件类型获取坐标
        dragStartX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        dragStartPos = parseInt(e.target.style.left);
        if (e.type.startsWith('touch')) e.preventDefault(); // 阻止触摸默认行为，如滚动
        dragTarget.style.cursor = 'grabbing';
    }
}

// 拖动过程
function drag(e) {
    if (!isDragging) return;
    
    // 阻止默认行为，特别是对于touchmove，防止页面滚动
    if (e.type.startsWith('touch')) e.preventDefault();

    const numberLine = document.getElementById('numberLine');
    const params = numberLine.axisParams;
    
    if (!params) return;
    
    // 计算新的位置
    const currentX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const dx = currentX - dragStartX;
    let newLeft = dragStartPos + dx;
    
    // 限制在数轴范围内
    newLeft = Math.max(params.axisMargin, Math.min(params.axisMargin + params.axisWidth, newLeft));
    
    // 更新位置
    dragTarget.style.left = `${newLeft}px`;
    
    // 计算对应的数学值
    const mathValue = params.startValue + (newLeft - params.axisMargin) / params.unitWidth;
    
    // 设置新的参数a值
    const constant = currentInequality1.constant;
    let newA = mathValue - constant;
    
    // 对参数a进行取值精确化，避免过多小数位
    newA = Math.round(newA * 100) / 100;
    
    if (isFinite(newA) && !isNaN(newA)) {
        // 更新参数显示
        document.getElementById('paramAValue').textContent = newA.toFixed(2);
        paramA = newA;
        
        // 在拖动过程中实时更新所有内容
        updateInequalities(); // updateInequalities内部会调用新的calculateIntegerSolutionsForNumberLine
    }
    
    // 防止拖动事件引发页面滚动
    e.preventDefault();
}

// 停止拖动
function stopDrag() {
    if (isDragging) {
        isDragging = false;
        if (dragTarget) {
            dragTarget.style.cursor = 'grab';
            dragTarget = null;
        }
        
        // 完整更新UI (确保在touchend后也更新)
        updateInequalities();
    }
}

// 生成指定范围内的随机整数
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 随机生成不等式组
function generateInequalities() {
    // 直接生成不含参不等式（形式：x > n 或 x < n，其中n为整数）
    let n = getRandomInt(-8, 8);
    let isLessThan2 = Math.random() < 0.5;
    // 随机决定是严格不等式还是非严格不等式
    let isStrict2 = Math.random() < 0.7; // 70%的概率是严格不等式
    
    // 直接生成含参不等式（形式：x > a+m 或 x < a+m 或 x > a-m 或 x < a-m，其中m为整数）
    let m = getRandomInt(1, 5);
    let isPositive = Math.random() < 0.5; // 决定常数项是加还是减
    let isLessThan1 = Math.random() < 0.5;
    // 随机决定是严格不等式还是非严格不等式
    let isStrict1 = Math.random() < 0.7; // 70%的概率是严格不等式
    
    // 在控制台输出调试信息
    console.log('生成不等式 - 含参:', isLessThan1 ? '小于' : '大于', isStrict1 ? '严格' : '非严格');
    console.log('生成不等式 - 不含参:', isLessThan2 ? '小于' : '大于', isStrict2 ? '严格' : '非严格');
    
    // 构建不等式对象 - 含参不等式
    // 将其设置为 ax + 0 > 0 或 ax + 0 < 0 的形式，通过自定义显示来表示
    currentInequality1 = {
        hasParam: true,
        a: 'a',
        b: 0,
        c: 0, 
        isLessThan: isLessThan1,
        strictInequality: isStrict1, // 添加严格不等式标志
        // 添加自定义显示属性
        customDisplay: isLessThan1 ? 
            (isPositive ? `x ${isStrict1 ? '&lt;' : '&le;'} a + ${m}` : `x ${isStrict1 ? '&lt;' : '&le;'} a - ${m}`) : 
            (isPositive ? `x ${isStrict1 ? '&gt;' : '&ge;'} a + ${m}` : `x ${isStrict1 ? '&gt;' : '&ge;'} a - ${m}`),
        // 存储常数项用于计算
        constant: isPositive ? m : -m
    };
    
    // 构建不等式对象 - 不含参不等式
    // 将其设置为简单的 x > n 或 x < n 形式
    currentInequality2 = {
        hasParam: false,
        a: 1,
        b: 0,
        c: n,
        isLessThan: isLessThan2,
        strictInequality: isStrict2, // 添加严格不等式标志
        // 添加自定义显示属性
        customDisplay: isLessThan2 ? `x ${isStrict2 ? '&lt;' : '&le;'} ${n}` : `x ${isStrict2 ? '&gt;' : '&ge;'} ${n}`
    };
    
    // 使用不含参不等式的边界值 n 作为数轴中心重新设置数轴
    setupNumberLine(n); 
    
    // 初始化参数a
    paramA = getRandomInt(1, 3);
    document.getElementById('paramAValue').textContent = paramA.toFixed(1);
    
    // 更新UI
    updateInequalities();
} 