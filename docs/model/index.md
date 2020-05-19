---
title: Model
nav_order: 3
has_children: true
---

# Model

Created via [`manager.model`](../manager/model).

Models inherit most of the [monk collection](https://automattic.github.io/monk/docs/collection/) instance methods.

#### Monk collection instance methods:
  * [_aggregate](https://automattic.github.io/monk/docs/collection/aggregate.html)
  * [_bulkWrite](https://automattic.github.io/monk/docs/collection/bulkWrite.html)
  * [_count](https://automattic.github.io/monk/docs/collection/count.html)
  * [_distinct](https://automattic.github.io/monk/docs/collection/distinct.html)
  * [_drop](https://automattic.github.io/monk/docs/collection/drop.html)
  * [_dropIndex](https://automattic.github.io/monk/docs/collection/dropIndex.html)
  * [_dropIndexes](https://automattic.github.io/monk/docs/collection/dropIndexes.html)
  * [_ensureIndex](https://automattic.github.io/monk/docs/collection/ensureIndex.html)
  * [_find](https://automattic.github.io/monk/docs/collection/find.html)
  * [_findOne](https://automattic.github.io/monk/docs/collection/findOne.html)
  * [_findOneAndDelete](https://automattic.github.io/monk/docs/collection/findOneAndDelete.html)
  * [_findOneAndUpdate](https://automattic.github.io/monk/docs/collection/findOneAndUpdate.html)
  * [_geoHaystackSearch](https://automattic.github.io/monk/docs/collection/geoHaystackSearch.html)
  * [_geoNear](https://automattic.github.io/monk/docs/collection/geoNear.html)
  * [_group](https://automattic.github.io/monk/docs/collection/group.html)
  * [_indexes](https://automattic.github.io/monk/docs/collection/indexes.html)
  * [_insert](https://automattic.github.io/monk/docs/collection/insert.html)
  * [_mapReduce](https://automattic.github.io/monk/docs/collection/mapReduce.html)
  * [_remove](https://automattic.github.io/monk/docs/collection/remove.html)
  * [_stats](https://automattic.github.io/monk/docs/collection/stats.html)
  * [_update](https://automattic.github.io/monk/docs/collection/update.html)

#### Monk collection
 
If you wish to access the raw monk collection, you can do so via:
```js
model._collection
```
