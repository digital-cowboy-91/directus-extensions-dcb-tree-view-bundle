<script setup lang="ts">
import { Ref } from 'vue';
import { UserNotice } from '../utils/types';

type Props = {
  message: Ref<UserNotice>;
};
defineProps<Props>();
</script>

<template>
  <VNotice class="tree__user-message" :type="message.type">
    <div>
      <h2>{{ message.title }}</h2>
      <div>{{ message.text }}</div>
    </div>
  </VNotice>
</template>

<style lang="css">
.tree__user-message {
  margin: 0 var(--content-padding);

  & h2 {
    margin-bottom: 0.5rem;
    font-weight: var(--theme--header--title--font-weight);
  }
}
</style>
