import {reactive} from 'vue';

export default {
  install(app) {
    const controller = window.ArbinatorTheme;
    const theme = reactive({preference: controller.preference, resolved: controller.resolved});
    const update = event => Object.assign(theme, event.detail);
    window.addEventListener('arbinator:theme-change', update);
    app.config.globalProperties.$theme = theme;
    app.config.globalProperties.$setTheme = value => controller.set(value);
    app.onUnmount(() => window.removeEventListener('arbinator:theme-change', update));
  },
};
