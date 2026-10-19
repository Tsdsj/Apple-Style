/* 在首屏渲染前执行（同步加载，体积极小）：
   1. 标记 JS 可用，供 CSS 做渐进增强；
   2. 应用访客手动选择的外观，避免深色/浅色闪烁。 */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var theme = localStorage.getItem('ll-theme');
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  } catch (e) { /* 隐私模式等情况下 localStorage 不可用，按系统外观显示 */ }
})();
