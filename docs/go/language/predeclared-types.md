---
title: "Predeclared Types"
---

:::info
Each type have zero value
:::


### Literals
- integer
- floating
- rune
- string
<!--TODO-->

### Booleans
zero value is `False`

### Numeric Types

#### integer

- int8, int16, int32, int64
- uint8, uint16, uint32, uint64

**Special integer types**

- `byte` => uint8
- int => int32(32 bit arch), int64(64 bit arch). Because of this inconsistency comparison of int to int is not valid.
- rune => int32
- uintptr => 
<!--TODO-->

#### Floating number
- float32, float64

Floating-point division has a couple of interesting properties. Dividing a nonzero floating-point variable by 0 returns `+Inf` or `-Inf` (positive or negative infinity), depending on the sign of the number. Dividing a floating-point variable set to 0 by 0 returns `NaN` (Not a Number).  as discussed in [here](#integer)


### String andd runes
- `''` (in single qoutes) => runes
- `""` (in double qoutes) => string

