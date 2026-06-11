import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from "@/router";
import store from "@/store";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { fas } from '@fortawesome/free-solid-svg-icons'
library.add(fas);
import { fab } from '@fortawesome/free-brands-svg-icons';
library.add(fab);
import { far } from '@fortawesome/free-regular-svg-icons';
library.add(far);
import { dom } from "@fortawesome/fontawesome-svg-core";
dom.watch();

import emitter from '@/plugins/eventBus';
import WebSocketPlugin from './plugins/webSocket.js';

const app = createApp(App)
app.config.warnHandler = () => {};
app.config.globalProperties.emitter = emitter;
app.use(vuetify)
app.use(router)
app.use(store)
app.use(WebSocketPlugin, {store});
app.use(FontAwesomeIcon)
app.mount('#app')
