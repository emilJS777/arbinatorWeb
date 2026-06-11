import { exchangesApi } from "@/api/exchanges.js";

const exchanges = {
    namespaced: true,
    actions: {
        async GET(context, query){
            return exchangesApi.getAll(query);
        },
        async POST(context, body){
            return exchangesApi.create(body);
        },
        async PUT(context, body){
            return exchangesApi.update(body.id, body.form);
        },
        async DELETE(context, id){
            return exchangesApi.remove(id);
        },
    },
}

export default exchanges
