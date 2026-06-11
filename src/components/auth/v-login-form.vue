<script>
export default {
  data(){
    return{
      form: {
        userName: '',
        telegramUserId: '',
        phoneNumber: '',
        password: ''
      }
    }
  },
  mounted() {
    this.form.userName = this.$route.query.username;
    this.form.phoneNumber = this.$route.query.phone_number;
    this.form.telegramUserId = this.$route.query.telegram_user_id;
  }
}
</script>

<template>
  <div class="d-grid g-gap-1">

    <div class="d-grid g-gap-_3">
      <h3 class="margin-0">Recover using Seed Phrase</h3>
      <span class="f-size-15">Enter the backup passphrase associated with the account.</span>
      <div class="m-top-05 d-grid">
        <textarea class="form-standard padding-2 b-radius-8" style="resize: none; min-height: 50px;" v-model="this.form.password" placeholder="Seed or private key"></textarea>
      </div>
    </div>

    <button class="padding-05 fa-border bg-content f-size-22 b-radius-8" @click="this.$emit('login', this.form)">Continue</button>
  </div>
</template>

<style scoped>

</style>
