import store from "@/store";


export default (to, from, next) => {
    if (localStorage.getItem("access_token")) {
        if(!store.state.user.USER){
            store.dispatch("user/GET_PROFILE", ``).then(response => {
                if (response.status === 200) {
                    // localStorage.setItem('user', JSON.stringify(response.obj))
                    store.commit("user/SET_USER", response.data)
                    next({ path: to.path })
                } else {
                    localStorage.removeItem("access_token")
                    next({ path: '/auth' });
                }
            })
        }
        else
            next()
    } else {
        next({ path: '/auth' });
    }
}
