// 智能网格布局：根据 URL 数量自动选择最佳行列分配
// 策略：cols = ceil(sqrt(N))，rows = ceil(N/cols)
// 最后一行不足时，将剩余单元格在该行内拉伸平分宽度，避免空白
//
// 输入：count 网址数量，width/height 容器像素尺寸
// 输出：[{x, y, w, h}, ...] 像素坐标矩形数组

function computeAutoGrid(count, width, height) {
  if (count <= 0 || width <= 0 || height <= 0) return [];

  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cellH = Math.floor(height / rows);

  const rects = [];
  let placed = 0;
  for (let r = 0; r < rows; r++) {
    const remaining = count - placed;
    const inThisRow = Math.min(cols, remaining);
    const cellW = Math.floor(width / inThisRow);
    const usedW = cellW * inThisRow;
    const offsetX = Math.floor((width - usedW) / 2);

    for (let c = 0; c < inThisRow; c++) {
      const isLastCol = c === inThisRow - 1;
      const isLastRow = r === rows - 1;
      rects.push({
        x: offsetX + c * cellW,
        y: r * cellH,
        w: isLastCol ? width - (offsetX + c * cellW) : cellW,
        h: isLastRow ? height - r * cellH : cellH,
      });
      placed++;
    }
  }
  return rects;
}

function computeManualGrid(cells, count, width, height) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const c = cells[i];
    if (!c) {
      out.push({ x: 0, y: 0, w: 0, h: 0 });
      continue;
    }
    out.push({
      x: Math.round(c.x * width),
      y: Math.round(c.y * height),
      w: Math.round(c.w * width),
      h: Math.round(c.h * height),
    });
  }
  return out;
}

function computeGrid(config, width, height) {
  const count = config.urls.length;
  if (config.layout === 'manual' && config.cells.length >= count && count > 0) {
    return computeManualGrid(config.cells, count, width, height);
  }
  return computeAutoGrid(count, width, height);
}

module.exports = { computeAutoGrid, computeManualGrid, computeGrid };
