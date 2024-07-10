<script setup lang="ts">
import { useSync } from '@directus/extensions-sdk';
import { Collection, Field } from '@directus/types';
import { ComputedRef, computed, ref, toRefs } from 'vue';
import { LayoutOptions } from './utils/types';

type Props = {
  allCollections: Collection[];
  defCollectionName: string;
  fieldsInCollection: ComputedRef<Field[]>;
  handleCreateModel: (field: string, metaCollectionName: string) => void;
  handleSaveCollapsed: () => void;
  userIsAdmin: boolean;
} & LayoutOptions;

const props = defineProps<Props>();
const { fieldsInCollection, defCollectionName, allCollections } = toRefs(props);

const activeTab = ref([0]);

const emit = defineEmits([
  'update:debug',
  'update:slugifyFieldName',
  'update:indentation',
  'update:labelPrimary',
  'update:labelSecondary',
  'update:statusIndicator',
  'update:metaCollectionName',
  'update:collapsed',
]);

// VIEW
const indentationSync = useSync(props, 'indentation', emit);
const labelPrimarySync = useSync(props, 'labelPrimary', emit);
const labelSecondarySync = useSync(props, 'labelSecondary', emit);
const statusIndicator = useSync(props, 'statusIndicator', emit);
const collapsedSync = useSync(props, 'collapsed', emit);

const fieldsWithDot = computed(() =>
  fieldsInCollection.value.filter((item) => Boolean(item?.meta?.display_options?.showAsDot)),
);

// CONFIG
const debugSync = useSync(props, 'debug', emit);
const slugifyFieldNameSync = useSync(props, 'slugifyFieldName', emit);
const metaCollectionNameSync = useSync(props, 'metaCollectionName', emit);

const collectionsWoDef = computed(() =>
  allCollections.value.filter((item: Collection) => item.collection !== defCollectionName.value),
);

// PLACEHOLDERS
const newmetaCollectionName = ref(defCollectionName.value + '_meta');
const newdefConnectorName = ref('meta');
</script>

<template>
  <div class="tree__options field">
    <VTabs v-model="activeTab" :style="{ width: '100%' }">
      <VTab>View</VTab>
      <VTab :disabled="!userIsAdmin">Configuration</VTab>
    </VTabs>
    <VTabsItems :model-value="activeTab">
      <VTabItem>
        <div class="field">
          <div class="type-label">Primary Label</div>
          <v-collection-field-template v-model="labelPrimarySync" :collection="defCollectionName" />
        </div>
        <div class="field">
          <div class="type-label">Secondary Label</div>
          <v-collection-field-template v-model="labelSecondarySync" :collection="defCollectionName" />
        </div>
        <div class="field">
          <div class="type-label">Status Indicator</div>
          <VSelect
            v-model="statusIndicator"
            item-value="field"
            item-text="name"
            :items="fieldsWithDot"
            :showDeselect="true"
          />
        </div>
        <div class="field">
          <div class="type-label">Indentation</div>
          <VInput v-model="indentationSync" type="number" :step="0.5" :max="5" :min="0.5" />
        </div>
        <div class="field collapsed">
          <div class="type-label">Collapsed items</div>
          <div class="wrapper">
            <VButton @click="handleSaveCollapsed" :fullWidth="true">Rember</VButton>
            <VButton v-show="collapsed.length > 0" @click="collapsedSync = []" :fullWidth="true">Clear</VButton>
          </div>
        </div>
      </VTabItem>
      <VTabItem>
        <div class="field">
          <div class="type-label">Related collection*</div>
          <VSelect
            v-model="metaCollectionNameSync"
            item-value="collection"
            item-text="name"
            :items="collectionsWoDef"
            :showDeselect="true"
          />
        </div>
        <template v-if="!Boolean(metaCollectionNameSync)">
          <div :style="{ margin: 'auto' }">or</div>
          <div class="field">
            <div class="type-label">Collection name*</div>
            <VInput v-model="newmetaCollectionName" :dbSafe="true" />
          </div>
          <div class="field">
            <div class="type-label">Connector name*</div>
            <VInput v-model="newdefConnectorName" :dbSafe="true" />
          </div>
          <VButton @click="handleCreateModel(newmetaCollectionName, newdefConnectorName)" :fullWidth="true">
            Create
          </VButton>
        </template>
        <div class="field">
          <div class="type-label">Field to slugify*</div>
          <VSelect
            v-model="slugifyFieldNameSync"
            item-value="field"
            item-text="name"
            :items="fieldsInCollection"
            :showDeselect="true"
          />
        </div>
        <div class="field">
          <VCheckbox v-model="debugSync">Debug Mode</VCheckbox>
        </div>
      </VTabItem>
    </VTabsItems>
  </div>
</template>

<style>
.tree__options {
  & .v-tabs {
    padding-bottom: var(--theme--form--row-gap);
  }
  & .v-tab-item,
  .wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--theme--form--row-gap);
  }
}
</style>
