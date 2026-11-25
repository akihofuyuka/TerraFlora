/*! @license AGPL-3.0 | Author: akihofuyuka */
import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { reportError, store } from './store';

const app = createApp(App);

app.config.errorHandler = (err, _instance, info) => {
  reportError(err, {
    code: 'UNEXPECTED',
    title: '页面渲染发生异常',
    context: { vueHook: info },
  });
};

window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, {
    code: 'UNEXPECTED',
    title: '异步操作发生未捕获异常',
  });
});

window.addEventListener('error', (event) => {
  if (event.error) {
    reportError(event.error, {
      code: 'UNEXPECTED',
      title: '运行时发生未捕获异常',
      context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  }
});

app.mount('#app');

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing && !store.isModified && !store.player) {
      refreshing = true;
      window.location.reload();
    }
  });
}
