/* ====== Shared radar chart (composer.html, song.html) ======
 * datasets: [{ values: {axisKey: score}, stroke, fill, visible, lineWidth?, showDots?, dotRadius? }]
 * Uses AXES from common.js for axis order, labels and colors.
 */
const RADAR_MAX = 10;

function drawRadar(ctx, W, H, datasets, options = {}) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - (options.labelMargin || 70);
  const n = AXES.length;

  ctx.clearRect(0, 0, W, H);

  // Grid
  const levels = [2, 4, 6, 8, 10];
  levels.forEach(lv => {
    const r = R * lv / RADAR_MAX;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = lv === 10 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (options.showGridLabels) {
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.font = `${options.gridFontSize || 18}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(lv, cx + 6, cy - r + 14);
    }
  });

  // Axis lines + labels
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const ex = cx + R * Math.cos(angle);
    const ey = cy + R * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (options.showAxisLabels !== false) {
      const lx = cx + (R + (options.labelOffset || 28)) * Math.cos(angle);
      const ly = cy + (R + (options.labelOffset || 28)) * Math.sin(angle);
      ctx.fillStyle = AXES[i].color;
      ctx.font = `bold ${options.labelFontSize || 20}px "Segoe UI","Noto Sans JP",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(AXES[i].label, lx, ly);
    }
  }

  // Data polygons
  datasets.forEach(ds => {
    if (!ds.visible) return;
    ctx.beginPath();
    AXES.forEach((ax, i) => {
      const val = ds.values[ax.key] ?? 0;
      const r = R * val / RADAR_MAX;
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = ds.fill;
    ctx.fill();
    ctx.strokeStyle = ds.stroke;
    ctx.lineWidth = ds.lineWidth || 2.5;
    ctx.stroke();

    // Dots
    if (ds.showDots !== false) {
      AXES.forEach((ax, i) => {
        const val = ds.values[ax.key] ?? 0;
        const r = R * val / RADAR_MAX;
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, ds.dotRadius || 4, 0, Math.PI * 2);
        ctx.fillStyle = ds.stroke;
        ctx.fill();
      });
    }
  });
}
