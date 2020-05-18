---
title: models
parent: Manager
---

# `manager.models`

Setup model definitions from a folder location

### Arguments

1. `path` *(string)*: path to model definitions

### Returns

An array of [model](../model) instances, the model instances will also be avaliable at:
```js
db.user
db.models.user
```

### Example

```js
const user = db.models(__dirname + "models")
```
