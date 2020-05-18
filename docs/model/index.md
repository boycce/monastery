---
title: Model
nav_order: 3
has_children: true
---

# Model

Created via [`manager.model`](/manager/model). 

Models inherit most of the monk collection instance methods.

#### Monk collection instance methods:

  * [_aggregate](/aggregate.md)
  * [_bulkWrite](/bulkWrite.md)
  * [_count](/count.md)
  * [_distinct](/distinct.md)
  * [_drop](/drop.md)
  * [_dropIndex](/dropIndex.md)
  * [_dropIndexes](/dropIndexes.md)
  * [_ensureIndex](/ensureIndex.md)
  * [_find](/find.md)
  * [_findOne](/findOne.md)
  * [_findOneAndDelete](/findOneAndDelete.md)
  * [_findOneAndUpdate](/findOneAndUpdate.md)
  * [_geoHaystackSearch](/geoHaystackSearch.md)
  * [_geoNear](/geoNear.md)
  * [_group](/group.md)
  * [_indexes](/indexes.md)
  * [_insert](/insert.md)
  * [_mapReduce](/mapReduce.md)
  * [_remove](/remove.md)
  * [_stats](/stats.md)
  * [_update](/update.md)

#### Monk collection
 
If you wish to access the raw monk collection, you can do so via:
```js
model._collection
```
