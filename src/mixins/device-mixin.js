const deviceMixin = {
  data() {
    return {
      mobileDevice: false
    }
  },
  created() {
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.checkMobile);
  },
  methods: {
    checkMobile() {
      this.mobileDevice = window.innerWidth < 575;
    }
  }
}

export default deviceMixin;
