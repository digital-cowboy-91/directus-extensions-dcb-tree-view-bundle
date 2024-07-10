<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

type Props = {
  dataLength: number;
  handleSaveChanges: () => void;
  hasInvalidItems: boolean;
  isInEditMode: boolean;
  processingMessage: string | null;
  refresh: () => void;
  toggleEditMode: () => void;
  userCanUpdate: boolean;
};

const props = defineProps<Props>();

const softDisabled = computed(() => Boolean(props.processingMessage));
const hardDisabled = computed(
  () => softDisabled.value || props.hasInvalidItems || !props.userCanUpdate || !props.dataLength,
);
</script>

<template>
  <div v-if="processingMessage" class="tree__action processing">{{ processingMessage }}</div>
  <VButton
    v-if="isInEditMode"
    class="tree__action"
    @click="handleSaveChanges"
    :rounded="true"
    :icon="true"
    tooltip="Save"
    :disabled="hardDisabled"
  >
    <VIcon name="check" />
  </VButton>
  <VButton
    v-if="isInEditMode"
    class="tree__action"
    @click="refresh"
    :rounded="true"
    :icon="true"
    :danger="true"
    tooltip="Cancel"
    :disabled="softDisabled"
  >
    <VIcon name="close" />
  </VButton>
  <VButton
    v-if="!isInEditMode"
    class="tree__action"
    @click="toggleEditMode"
    :rounded="true"
    :icon="true"
    tooltip="Sort Tree"
    :disabled="hardDisabled"
  >
    <VIcon name="swap_vert" />
  </VButton>
</template>

<style>
.tree__action {
  margin-right: 8px;
  &.processing {
    color: var(--theme--foreground-subdued);
  }
}
</style>
