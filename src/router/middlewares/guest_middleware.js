import store from "@/store";


export default (to, from, next) => {
    if (localStorage.getItem("access_token")) {
        store.dispatch("user/GET_PROFILE", ``).then(response => {
            if (response.status === 200) {
                store.commit("user/SET_USER", response.obj)
                next({ path: "/" })
            } else {
                localStorage.removeItem("access_token")
                next()
            }
        })
    }
    else {
        next()
    }
}
