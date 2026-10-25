/**
 * ClientRouter 页面过渡下的组件生命周期工具。
 *
 * 开启 ClientRouter 后,打包的模块脚本只执行一次,而 DOM 每次导航都会被替换:
 * 组件初始化必须跟随 astro:page-load 重跑,并在 astro:before-swap 清理
 * window/document 级监听器,避免跨导航累积。
 *
 * 无 ClientRouter(纯 MPA)时 astro:page-load 不会触发,因此注册时立即执行一次;
 * run() 会先调用上一次的清理函数,首屏"注册即执行 + 首次 page-load"的重复触发是幂等的。
 */
export function onPageLoad(init: () => void | (() => void)): void {
  let cleanup: (() => void) | void;
  const run = () => {
    cleanup?.();
    cleanup = init();
  };
  const stop = () => {
    cleanup?.();
    cleanup = undefined;
  };
  document.addEventListener('astro:page-load', run);
  document.addEventListener('astro:before-swap', stop);
  run();
}
