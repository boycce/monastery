---
title: Errors
nav_order: 6
---

# Error Responses

All monastery [model operations](./model/#table-of-contents) return errors in the [JSON API error specification](https://jsonapi.org/format/#errors) format. Error object(s) are always returned in an array.

### Example

```json
[{
  "detail": "Value needs to be at least 10 characters long.",
  "status": "400",
  "title": "address.city",
  "meta": {
    "field": "city",
    "model": "user",
    "rule": "minLength"
  }
}]
```

Error on an array item

```json
[{
  "detail": "The title is required.",
  "status": "400",
  "title": "comments.0.title",
  "meta": {
    "field": "title",
    "model": "user",
    "rule": "required"
  }
}]
```
