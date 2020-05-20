---
title: Model
nav_order: 3
has_children: true
---

# Model

Created via [`manager.model`](../manager/model).

Models inherit most of the [monk collection](https://automattic.github.io/monk/docs/collection/) instance methods which are accessible under the model.

#### Monk collection instance methods available on `model`:
  * model.[_aggregate](https://automattic.github.io/monk/docs/collection/aggregate.html)
  * model.[_bulkWrite](https://automattic.github.io/monk/docs/collection/bulkWrite.html)
  * model.[_count](https://automattic.github.io/monk/docs/collection/count.html)
  * model.[_distinct](https://automattic.github.io/monk/docs/collection/distinct.html)
  * model.[_drop](https://automattic.github.io/monk/docs/collection/drop.html)
  * model.[_dropIndex](https://automattic.github.io/monk/docs/collection/dropIndex.html)
  * model.[_dropIndexes](https://automattic.github.io/monk/docs/collection/dropIndexes.html)
  * model.[_ensureIndex](https://automattic.github.io/monk/docs/collection/ensureIndex.html)
  * model.[_find](https://automattic.github.io/monk/docs/collection/find.html)
  * model.[_findOne](https://automattic.github.io/monk/docs/collection/findOne.html)
  * model.[_findOneAndDelete](https://automattic.github.io/monk/docs/collection/findOneAndDelete.html)
  * model.[_findOneAndUpdate](https://automattic.github.io/monk/docs/collection/findOneAndUpdate.html)
  * model.[_geoHaystackSearch](https://automattic.github.io/monk/docs/collection/geoHaystackSearch.html)
  * model.[_geoNear](https://automattic.github.io/monk/docs/collection/geoNear.html)
  * model.[_group](https://automattic.github.io/monk/docs/collection/group.html)
  * model.[_indexes](https://automattic.github.io/monk/docs/collection/indexes.html)
  * model.[_insert](https://automattic.github.io/monk/docs/collection/insert.html)
  * model.[_mapReduce](https://automattic.github.io/monk/docs/collection/mapReduce.html)
  * model.[_remove](https://automattic.github.io/monk/docs/collection/remove.html)
  * model.[_stats](https://automattic.github.io/monk/docs/collection/stats.html)
  * model.[_update](https://automattic.github.io/monk/docs/collection/update.html)

#### Monk collection
 
If you wish to access the raw monk collection, you can do so via:
```js
model._collection
```
