import { UUID } from 'crypto';

export type LayoutOptions = {
  collapsed: string[];
  debug: boolean | undefined;
  defConnectorName: string | undefined;
  slugifyFieldName: string | undefined;
  indentation: number;
  labelPrimary: string | undefined;
  labelSecondary: string | undefined;
  metaCollectionName: string | undefined;
  statusIndicator: string | undefined;
};

export type GroupItem = {
  text: string;
  value: string;
  max_level: number;
};

export type DataGroupItem = {
  _id: string;
  _has_dirty: boolean;
} & GroupItem;

export type DataGroup = Map<string, DataGroupItem>;

export type Item = {
  rels_children: UUID[];
  group: string;
  id: UUID;
  rel_item: {
    [key: string]: any;
  };
  level: number;
  rel_parent: UUID | null;
  path: string;
  slug: string;
  sort: number;
  slug_is_key: boolean;
};

export type DataItem = {
  _allow_children: boolean;
  _changes: any;
  _is_dirty: boolean;
  _is_expanded: boolean;
  id: UUID | null;
} & Omit<Item, 'id'>;

export type Data = Map<string, DataItem>;

export type DropFromTo = {
  index: number;
  parent: string;
};

export type DroppedItem = {
  itemId: UUID;
  from: DropFromTo;
  to: DropFromTo;
};

export type DirtyItems = Map<string, string>;

export type GetItem = (key: string) => DataItem;

export type UserNotice = { type: 'info' | 'warning' | 'danger'; title: string; text: string };
