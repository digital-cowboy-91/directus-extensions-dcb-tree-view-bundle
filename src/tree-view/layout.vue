<script setup lang="ts">
import type { ShowSelect } from '@directus/extensions';
import { computed, ref, toRefs } from 'vue';
import Notice from './components/Notice.vue';
import TreeBranch from './components/TreeBranch.vue';
import type { DataGroup, GetItem, UserNotice } from './utils/types';

defineOptions({ inheritAttrs: false });

type Props = {
  dataLength: number;
  debug: boolean;
  defCollectionName: string;
  defPrimKeyName: string | undefined;
  getItem: GetItem;
  groups: DataGroup;
  handleDrop: () => void;
  indentation: number;
  isInEditMode: boolean;
  labelPrimary: string;
  labelSecondary: string;
  processingMessage: string | null;
  selection: (number | string)[];
  selectItem: (key: string) => void;
  showSelect: ShowSelect;
  statusIndicator: string;
  userNotice: UserNotice;
};

const props = defineProps<Props>();
const { isInEditMode } = toRefs(props);
const activeTab = ref([0]);
const tabs = computed(() => [...props.groups].slice(1).map(([_key, val]) => val));
const tabItems = computed(() => tabs.value.map(({ value }) => props.getItem(value)));
</script>

<template>
  <Notice v-if="userNotice !== null" :message="userNotice" />
  <div
    v-if="(userNotice === null || userNotice.type !== 'danger') && dataLength"
    class="tree__layout"
    :data-edit-mode="isInEditMode"
  >
    <div v-show="item.rels_children.length || isInEditMode" v-for="item in [getItem('ungrouped')]" :key="item.group">
      <VDivider class="ungrouped-header divider">Ungrouped</VDivider>
      <TreeBranch
        v-bind="props"
        :parentItem="item"
        @onDrop="handleDrop"
        :style="{ '--tree__layout--indentation': indentation + 'rem' }"
      />
    </div>
    <div v-if="groups.size > 1">
      <VTabs v-model="activeTab">
        <VTab v-for="{ text, value, _has_dirty } in tabs" :key="value" :data-is-dirty="_has_dirty">
          {{ text }}
        </VTab>
      </VTabs>
      <VDivider class="divider" />
      <VTabsItems :model-value="activeTab">
        <template v-for="item in tabItems" :key="item.group">
          <VTabItem>
            <div v-show="item.rels_children.length === 0 && !isInEditMode">No items</div>
            <TreeBranch
              v-bind="props"
              :parentItem="item"
              @onDrop="handleDrop"
              :style="{ '--tree__layout--indentation': indentation + 'rem' }"
            />
          </VTabItem>
        </template>
      </VTabsItems>
    </div>
  </div>
</template>

<style>
.tree__layout {
  padding: var(--content-padding);

  &,
  & .tree__branch,
  & .tree__item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  & .divider {
    margin-bottom: var(--content-padding);
  }

  &[data-edit-mode='false'] {
    & .ungrouped-header {
      display: none;
    }
  }
}

/* INDICATOR */
.tree__layout {
  & .v-tab {
    position: relative;
  }
  & .v-tab,
  & .tree__item {
    &[data-is-dirty]:after {
      content: '';
      width: 0.5rem;
      height: 0.5rem;
      background-color: var(--danger);
      border-radius: 50%;
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
    }

    &[data-is-dirty='false']:after {
      display: none;
    }
  }

  /* BUBBLING */
  & .v-tab[data-is-dirty='true'],
  & .tree__item[data-is-dirty='false'][data-is-expanded='false']:has(.tree__item[data-is-dirty='true']) {
    &:after {
      display: block;
      background-color: var(--warning);
    }
  }
}
</style>
