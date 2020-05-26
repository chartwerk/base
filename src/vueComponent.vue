<template>
  <div id="vue-chartwerk-base">
  </div>
</template>

<script lang="ts">
import { ChartwerkBase } from '../dist/index.js';

import { Margin, TimeSerie, Options, TickOrientation, TimeFormat } from './types';

import { Component, Vue, Prop, Watch } from 'vue-property-decorator';

import * as _ from 'lodash';

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
    this.appendEvents();
    //@ts-ignore
    new ChartwerkBase(document.getElementById('vue-chartwerk-base'), this.series, this.options);
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

  zoomIn(): void {
    this.$emit('zoomIn');
  }

  zoomOut(): void {
    this.$emit('zoomOut');
  }

  mouseMove(): void {
    this.$emit('mouseMove');
  }

  mouseOut(): void {
    this.$emit('mouseOut');
  }

  onLegendClick(): void {
    this.$emit('onLegendClick');
  }
}
</script>

<style scoped>
#vue-chartwerk-base {
  width: 100%;
  height: 100%;
}
</style>
