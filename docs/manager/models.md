---
title: models
parent: Manager
---

# `manager.models`

Setup model definitions from a folder location

#### Arguments

1. `path` *(string)*: path to model definitions

#### Returns

An array of [Model](../model) instances, the model instances will also be avaliable at:
```javascript
db.user
db.models.user
```

#### Example

```js
const user = db.models(__dirname + "models")
```
