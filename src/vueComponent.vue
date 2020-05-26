<template>
  <div :id="id">
  </div>
</template>

<script lang="ts">
import { ChartwerkBase } from '../dist/index.js';

import { Margin, TimeSerie, VueOptions, TickOrientation, TimeFormat } from './types';

import { Component, Vue, Prop, Watch } from 'vue-property-decorator';

import * as _ from 'lodash';

@Component
export default class VueChartwerkBase extends Vue {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  series!: TimeSerie[];

  @Prop({ required: true })
  options!: VueOptions;

  @Watch('series')
  @Watch('options')
  onParamChanged(): void {
    this.renderBase();
  }

  renderBase(): void {
    this.appendEvents();
    //@ts-ignore
    new ChartwerkBase(document.getElementById(this.id), this.series, this.options);
  }

  appendEvents(): void {
    if(_.has(this.$listeners, '$listeners.zoomIn')) {
      this.options.eventsCallbacks.zoomIn = this.zoomIn;
    }
    if(_.has(this.$listeners, '$listeners.zoomOut')) {
      this.options.eventsCallbacks.zoomOut = this.zoomOut;
    }
    if(_.has(this.$listeners, '$listeners.mouseMove')) {
      this.options.eventsCallbacks.mouseMove = this.mouseMove;
    }
    if(_.has(this.$listeners, '$listeners.mouseOut')) {
      this.options.eventsCallbacks.mouseOut = this.mouseOut;
    }
    if(_.has(this.$listeners, '$listeners.onLegendClick')) {
      this.options.eventsCallbacks.onLegendClick = this.onLegendClick;
    }
  }

  zoomIn(range: [number, number]): void {
    this.$emit('zoomIn', range);
  }

  zoomOut(center: number): void {
    this.$emit('zoomOut', center);
  }

  mouseMove(evt: any): void {
    this.$emit('mouseMove', evt);
  }

  mouseOut(): void {
    this.$emit('mouseOut');
  }

  onLegendClick(idx: number): void {
    this.$emit('onLegendClick', idx);
  }
}
</script>

<style scoped>
#vue-chartwerk-base {
  width: 100%;
  height: 100%;
}
</style>
