const toggleMixin = {
    data(){
        return{
            temporaryModelName: false,
            modalName: false,
            id: null,
            obj: null
        }
    },
    methods:{
        setModalName(modal_name, id=null, obj=null){
            this.modalName = false;
            this.id = null;
            this.$nextTick(() => {
                this.modalName = modal_name
                this.id = id
                this.obj = obj
            })
        },
        setTemporaryModelName(temporary_model_name, timer=2000){
            this.temporaryModelName = temporary_model_name
            setTimeout(() => {
                this.temporaryModelName = false
            }, timer)
        },
        refreshModalName(){

        }
    }
}
export default toggleMixin
