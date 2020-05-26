<template>
  <div id="vue-chartwerk-base">
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';

import { ChartwerkBase } from '../dist/index.js';

import { Margin, TimeSerie, Options, TickOrientation, TimeFormat } from './types';

@Component
export default class VueChartwerkBase extends Vue {
  @Prop({ required: true })
  series!: TimeSerie[];

  @Prop({ required: true })
  options!: Options;

  @Watch('series')
  @Watch('options')
  onParamChanged(): void {
    this.renderBase();
  }

  renderBase(): void {
    //@ts-ignore
    new ChartwerkBase(document.getElementById('vue-chartwerk-base'), this.series, this.options);
  }
}
</script>

<style scoped>
#vue-chartwerk-base {
  width: 100%;
  height: 100%;
}
</style>
