<script setup lang="ts">
import type { ShowSelect } from '@directus/extensions';
import _ from 'lodash';
import Sortable from 'sortablejs';
import { Ref, computed, onUnmounted, onUpdated, ref, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';
import { DroppedItem, GetItem } from '../utils/types';
import type { DataItem } from './utils/types';

type Props = {
  debug: boolean;
  defCollectionName: string;
  defPrimKeyName: string | undefined;
  getItem: GetItem;
  isInEditMode: Ref<boolean>;
  labelPrimary: string;
  labelSecondary: string;
  parentItem: DataItem;
  processingMessage: string | null;
  selection: (number | string)[];
  selectItem: (key: string) => void;
  showSelect: ShowSelect;
  statusIndicator: string;
};

const props = defineProps<Props>();
const { parentItem, isInEditMode, processingMessage } = toRefs(props);
const { getItem, defCollectionName } = props;
const emit = defineEmits(['onDrop']);

// ITEMS
const items = computed(() => parentItem.value.rels_children.map((key: string) => getItem(key)) || []);

// SORTABLE
const containerRef = ref<HTMLElement | null>(null);
const sortable = ref<Sortable | null>(null);
watch(containerRef, (container) => {
  if (container) {
    sortable.value = new Sortable(container, {
      group: 'dcb-tree',
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.65,
      handle: '.drag-handle',
      draggable: '.tree__item',
      onEnd: (event) => {
        const { item, from, to, newIndex, oldIndex } = event;
        const itemId = item.dataset?.id;
        const fromParent = from.closest<HTMLElement>('[data-parent]')?.dataset?.parent;
        const toParent = to.closest<HTMLElement>('[data-parent]')?.dataset?.parent;

        if (!itemId || !fromParent || !toParent) return;

        const payload = {
          itemId,
          from: {
            parent: fromParent,
            index: oldIndex,
          },
          to: {
            parent: toParent,
            index: newIndex,
          },
        } as DroppedItem;

        if (_.isMatch(payload.from, payload.to)) return;

        emit('onDrop', payload);
      },
    });
  }
});

const isDisabled = computed(() => !isInEditMode.value || processingMessage.value !== null);
watch(isDisabled, (newVal) => sortable.value?.option('disabled', newVal));

onUnmounted(() => {
  if (sortable.value) {
    sortable.value.destroy();
    containerRef.value = null;
    sortable.value = null;
  }
});

// NAVIGATE
const router = useRouter();
function goTo(id: string | number) {
  if (isInEditMode.value) return;
  router.push(`/content/${defCollectionName}/${id}`);
}

// RENDER COUNT
const renderCount = ref(1);
onUpdated(() => {
  renderCount.value++;
});
</script>

<template>
  <div
    class="tree__branch"
    :class="{ 'drop-area': isInEditMode && parentItem.rels_children.length === 0 }"
    ref="containerRef"
    :data-parent="parentItem.id || parentItem.group"
  >
    <template v-for="el in items" :key="el.id">
      <div
        class="tree__item"
        :data-id="el.id"
        :data-is-dirty="el._is_dirty"
        :data-is-expanded="el._is_expanded"
        :data-is-leaf="!el._allow_children"
        :data-has-children="el.rels_children.length > 0"
      >
        <VListItem block :grow="debug" :clickable="!isInEditMode" @click="() => goTo(el.rel_item[defPrimKeyName])">
          <VIcon name="drag_handle" class="drag-handle" />
          <button
            class="button-expand"
            @click.stop="el._is_expanded = !el._is_expanded"
            :disabled="el.rels_children.length === 0 && !isInEditMode"
          >
            <v-icon name="chevron_right" />
          </button>
          <div class="labels">
            <div v-if="!debug" class="wrapper">
              <RenderTemplate
                v-if="labelPrimary"
                :collection="defCollectionName"
                :item="el.rel_item"
                :template="labelPrimary"
              />
              <RenderTemplate
                v-if="labelSecondary"
                class="label-secondary"
                :collection="defCollectionName"
                :item="el.rel_item"
                :template="labelSecondary"
              />
            </div>
            <div v-else>
              <div class="debug-label">
                <template v-for="[key, val] in Object.entries(el)" :key="key">
                  <code>{{ key }}: {{ key === '_changes' ? JSON.stringify([...val]) : JSON.stringify(val) }}</code>
                </template>
              </div>
            </div>
            <RenderTemplate
              v-if="statusIndicator && !debug"
              class="status-indicator"
              :collection="defCollectionName"
              :item="el.rel_item"
              :template="'{{' + statusIndicator + '}}'"
            />
            <div v-else-if="debug" :style="{ 'text-align': 'center' }">
              render
              <br />
              {{ renderCount }}
            </div>
          </div>
          <VCheckbox
            class="selection-checkbox"
            :icon-on="showSelect === 'one' ? 'radio_button_checked' : undefined"
            :icon-off="showSelect === 'one' ? 'radio_button_unchecked' : undefined"
            :model-value="selection.includes(el.rel_item[defPrimKeyName])"
            @update:model-value="selectItem(el.rel_item[defPrimKeyName])"
            @click.stop="() => {}"
          />
        </VListItem>
        <TreeBranch v-bind="props" @onDrop="(ev: DroppedItem) => emit('onDrop', ev)" :parentItem="el" />
      </div>
    </template>
  </div>
</template>

<style lang="css">
.tree__branch {
  &.drop-area {
    min-height: var(--theme--form--field--input--height);
    padding: 0.5rem;
    padding-right: 0;
    border: var(--theme--border-width) dashed var(--theme--form--field--input--border-color);
    border-radius: var(--theme--border-radius);
  }

  & .tree__item {
    position: relative;

    & > li {
      gap: var(--content-padding);
    }

    & li + .tree__branch {
      margin-left: var(--tree__layout--indentation);
    }

    & .drag-handle {
      cursor: grab;
    }

    /* EXPAND BUTTON */
    & .button-expand {
      & > .v-icon {
        transition: var(--fast) var(--transition);
      }
      &:disabled {
        color: var(--theme--foreground-subdued);
        cursor: not-allowed;
      }
    }

    &[data-is-expanded='true'] > li > .button-expand > .v-icon {
      transform: rotate(90deg);
    }

    &[data-is-leaf='true'] .button-expand {
      display: none;
    }

    /* LABELS */
    & .labels {
      flex-grow: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--content-padding);
      min-width: 150px;

      & > .wrapper {
        min-width: 100px;
      }

      & .label-secondary {
        font-size: 0.8rem;
        color: var(--theme--foreground-subdued);
      }
      & .debug-label {
        font-size: 0.8rem;
        display: flex;
        flex-direction: column;
        word-break: break-all;
      }

      & > .status-indicator {
        min-width: 24px;
        text-overflow: clip;
      }
    }

    /* HIGHLIGHT INVALID LEVELS */
    &[data-is-leaf='true'] .tree__item > li {
      &,
      &:hover {
        border-color: var(--danger);
        color: var(--danger);
      }
    }

    /* HANDLE BRANCH EXPANSION */
    &[data-is-expanded='false'] > .tree__branch {
      display: none;
    }

    &[data-has-children='true'][data-is-leaf='true'] > .tree__branch {
      display: flex;
    }
  }
}

.tree__layout {
  &[data-edit-mode='false'] {
    .drag-handle {
      display: none;
    }
  }
  &[data-edit-mode='true'] {
    .selection-checkbox {
      display: none;
    }
  }
}
</style>
