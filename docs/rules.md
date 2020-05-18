---
title: Rules
nav_order: 5
---

# Validation Rules

  All rules except for `type` and `required` are ignored if the data value is a null or an empty string

  Rule | Rule argument
  - | -
  required | boolean
  type | string ('string', 'boolean', 'number', 'integer', 'id', 'any')
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

*See [validator](https://github.com/validatorjs/validator.js#validators) for their validator logic*

