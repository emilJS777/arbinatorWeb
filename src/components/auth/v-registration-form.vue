<script>
import VSeedPhraseKeyBlock from "@/components/seed-phrace/v-seed-phrase-key-block.vue";

export default {
  components: {VSeedPhraseKeyBlock},
  data(){
    return{
      form: {
        userName: '',
        phoneNumber: '',
        telegramUserId: '',
        password: '',
        confirmPassword: '',
      }
    }
  },
  mounted() {
    this.generatePassword(50)
    this.form.userName = this.$route.query.username;
    this.form.phoneNumber = this.$route.query.phone_number;
    this.form.telegramUserId = this.$route.query.telegram_user_id;
  },
  methods: {
    generatePassword(length) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((i + 1) % 4 === 0 && i !== 19) {
          password += ' ';
        }
      }
      this.form.password = password;
      this.form.confirmPassword = password;
    }
  }
}
</script>

<template>
  <div class="d-grid g-gap-1">
    <div class="d-grid g-gap-_3">
      <h3 class="margin-0">Address</h3>
      <span class="f-size-15">We have created a unique NEAR address for you, which is similar to your telegram nickname.</span>
      <div class="m-top-05 d-grid">
        <label class="f-size-13">Nnickname</label>
        <input type="text" class="padding-1 f-size-16 b-radius-8 bg-ccc-opacity border-0" disabled v-model="this.form.userName" v-if="this.form.userName">
        <input type="text" class="padding-1 f-size-16 b-radius-8 bg-ccc-opacity border-0" disabled v-model="this.form.phoneNumber" v-if="this.form.phoneNumber">

      </div>
    </div>

<!--    <div class="d-grid g-gap-_3">-->
<!--      <h3 class="margin-0">Seed phrase</h3>-->
<!--      <span class="f-size-15">Copy your seed phrase right now to avoid losing your account!</span>-->
<!--      <div class="m-top-05 d-grid">-->
<!--        <textarea class="form-standard padding-2 b-radius-8" style="resize: none; min-height: 50px;" disabled >{{this.form.password}}</textarea>-->
<!--        -->
<!--      </div>-->
<!--    </div>-->
    <v-seed-phrase-key-block :token="this.form.password" title="Seed phrase" description="Copy your seed phrase right now to avoid losing your account!" />

    <button class="padding-05 fa-border bg-content f-size-22 b-radius-8" @click="this.$emit('registration', this.form)">Create</button>
  </div>
</template>

<style scoped>

</style>
