---
title: Rules
nav_order: 5
---

# Validation Rules

  All rules except for `type` and `required` are ignored if the data value is a **null** or an **empty string**

  Rule | Rule argument
  - | -
  enum | array of strings (for the 'string' type only)
  isAfter | see validator.isAfter
  isBefore | see validator.isBefore
  isCreditCard | see validator.isCreditCard
  isEmail | see validator.isEmail
  isHexColor | see validator.isHexColor
  isIn | see validator.isIn
  isIP | see validator.isIP
  isNotIn | see validator.isIn
  isURL | see validator.isURL
  isUUID | see validator.isUUID
  min | number
  max | number
  minLength | number
  maxLength | number
  regex | see validator.matches
  required | boolean
  type | string - 'string', 'boolean', 'number', 'integer', 'date', 'id', 'any', '[image](#image-type)'

  *See [validator](https://github.com/validatorjs/validator.js#validators) for their validator logic*

  *Dates are unix timestamps in seconds, you change this to milliseconds via the [manager configurations](./manager). We hope to support other string based timestamp variations soon..*

### Image type

  `type: 'image'` will be converted to `type: 'any'` upon initialisation without any image plugins. This type allows plugins to hook into field type. See the corresponding plugins for more details or [monastery's default image plugin](./image-plugin).
