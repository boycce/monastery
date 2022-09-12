# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.39.1](https://github.com/boycce/monastery/compare/1.39.0...1.39.1) (2022-09-12)

## [1.39.0](https://github.com/boycce/monastery/compare/1.38.3...1.39.0) (2022-09-11)

### [1.38.3](https://github.com/boycce/monastery/compare/1.38.2...1.38.3) (2022-08-17)

### [1.38.2](https://github.com/boycce/monastery/compare/1.38.1...1.38.2) (2022-07-31)


### Bug Fixes

* init load time ([2273f11](https://github.com/boycce/monastery/commit/2273f11a654a9cfe05ee15ed682203a8752237d6))

### [1.38.1](https://github.com/boycce/monastery/compare/1.38.0...1.38.1) (2022-06-20)


### Bug Fixes

* changed ACL default ([cc92624](https://github.com/boycce/monastery/commit/cc926243728d0752940359fe4ae4a490f21b5750))

## [1.38.0](https://github.com/boycce/monastery/compare/1.37.3...1.38.0) (2022-06-17)


### Features

* added options.metadata ([cb4ca43](https://github.com/boycce/monastery/commit/cb4ca43a395c1f90a5e37b8cc95472053e2b3b36))

### [1.37.3](https://github.com/boycce/monastery/compare/1.37.2...1.37.3) (2022-06-17)


### Bug Fixes

* test ([dad21ad](https://github.com/boycce/monastery/commit/dad21ad9c014a45ccc50a4755daa12941d6b7465))

### [1.37.2](https://github.com/boycce/monastery/compare/1.37.1...1.37.2) (2022-06-13)


### Bug Fixes

* changed the default awsAcl from public-read to private ([ba383b5](https://github.com/boycce/monastery/commit/ba383b5f363dafe3b893e08de1a124b7ce96df44))

### [1.37.1](https://github.com/boycce/monastery/compare/1.37.0...1.37.1) (2022-06-13)


### Bug Fixes

* add _id to upserted document ([a78512f](https://github.com/boycce/monastery/commit/a78512f16b39422160756fe91ef4d4a3239f5890))

## [1.37.0](https://github.com/boycce/monastery/compare/1.36.3...1.37.0) (2022-06-12)


### Features

* added manager options (path, params, getSignedUrl, filesize, awsAcl) ([3e95609](https://github.com/boycce/monastery/commit/3e95609385820ecfd606500676fa87f8c9b4f02d))


### Bug Fixes

* warnings printing by default ([e1dc442](https://github.com/boycce/monastery/commit/e1dc442f20c78fcc65e19afaf5f0f8410bbcc31d))

### [1.36.3](https://github.com/boycce/monastery/compare/1.36.2...1.36.3) (2022-05-27)


### Bug Fixes

* order maintained when mixing of formData/dotNotation with normal key values ([898fa90](https://github.com/boycce/monastery/commit/898fa90a25e81ae1d2413e32ca67173fdef733a9))

### [1.36.2](https://github.com/boycce/monastery/compare/1.36.1...1.36.2) (2022-05-26)


### Bug Fixes

* nullObjects were skipping required rules ([315af00](https://github.com/boycce/monastery/commit/315af000ea274a165e58a39b850508bd3a417642))
* refactored tests (oid) ([439aa27](https://github.com/boycce/monastery/commit/439aa279c5073d1652b8a6b81f2fce7ae403b0d5))
* tests (oid) ([bd92970](https://github.com/boycce/monastery/commit/bd92970957c9cb0bd5e0a4b4c4433fd4b6c6b7d7))

### [1.36.1](https://github.com/boycce/monastery/compare/1.36.0...1.36.1) (2022-04-16)


### Bug Fixes

* findOneAndUpdate population, blacklisting, etc ([19c4fc9](https://github.com/boycce/monastery/commit/19c4fc96d8c94d9dd68af2a74af693c8dc7a4c17))

## [1.36.0](https://github.com/boycce/monastery/compare/1.35.0...1.36.0) (2022-04-15)


### Features

* added findOneAndUpdate ([60b518a](https://github.com/boycce/monastery/commit/60b518a1d09002a794e72fe3476c39c43c0c3b5e))


### Bug Fixes

* removed depreciation warnings ([6db73bb](https://github.com/boycce/monastery/commit/6db73bba7916b4c5c98a24fd03b34c0f776abb5c))

## [1.35.0](https://github.com/boycce/monastery/compare/1.34.0...1.35.0) (2022-04-08)


### Features

* Blacklist `false` removes all blacklisting, added tests for blacklisting/project stirng ([5999859](https://github.com/boycce/monastery/commit/599985972cc14b980148db26c03108feabf23756))
* Add project to insert/update/validate ([1b1eb12](https://github.com/boycce/monastery/commit/1b1eb12bc476ff82445a46489db64b37c13f9513))
* Whitelisting a parent will remove any previously blacklisted children ([1b1eb12](https://github.com/boycce/monastery/commit/1b1eb12bc476ff82445a46489db64b37c13f9513))
* Blacklist/project works the same across find/insert/update/validate ([1b1eb12](https://github.com/boycce/monastery/commit/1b1eb12bc476ff82445a46489db64b37c13f9513))

## [1.34.0](https://github.com/boycce/monastery/compare/1.33.0...1.34.0) (2022-04-05)


### Features

* added db.arraySchema / db.arrayWithSchema ([4210dc3](https://github.com/boycce/monastery/commit/4210dc33486de757a22d0973e661522e19230158))

## [1.33.0](https://github.com/boycce/monastery/compare/1.32.5...1.33.0) (2022-04-05)


### Features

* whitelisting a parent will remove any previously blacklisted children ([d335c2e](https://github.com/boycce/monastery/commit/d335c2e2e9e691b2c0b406f06cb9c2ed14f8bb25))

### [1.32.5](https://github.com/boycce/monastery/compare/1.32.4...1.32.5) (2022-03-21)


### Bug Fixes

* dates not enforcing numbers ([d5a2a53](https://github.com/boycce/monastery/commit/d5a2a533f497b3c9e50cbeb66407cf9bc08dd2e4))

### [1.32.4](https://github.com/boycce/monastery/compare/1.32.3...1.32.4) (2022-03-07)

### [1.32.3](https://github.com/boycce/monastery/compare/1.32.2...1.32.3) (2022-03-07)


### Bug Fixes

* fileSize warning ([3824b23](https://github.com/boycce/monastery/commit/3824b23883fad508e081d2a2bce1c340ec2775dc))

### [1.32.2](https://github.com/boycce/monastery/compare/1.32.1...1.32.2) (2022-03-04)


### Bug Fixes

* missing original non-validated this.data in beforeUpdate ([4b4002d](https://github.com/boycce/monastery/commit/4b4002d3d4d2609025cbb22cacecf948252be38b))

### [1.32.1](https://github.com/boycce/monastery/compare/1.32.0...1.32.1) (2022-03-01)


### Bug Fixes

* processAfterFind bug ([3183b79](https://github.com/boycce/monastery/commit/3183b79fc288665000b63e0221fbe8acf6f482aa))

## [1.32.0](https://github.com/boycce/monastery/compare/1.31.7...1.32.0) (2022-02-28)


### Features

* added getSignedUrl(s) ([3552a4d](https://github.com/boycce/monastery/commit/3552a4d0b21c192a256a590e3ac1cb48b31c6564))
* added image optiosn filename, and params ([353b2f0](https://github.com/boycce/monastery/commit/353b2f09ed429a5cd8d74a3b2e94493650fb52e4))

### [1.31.7](https://github.com/boycce/monastery/compare/1.31.6...1.31.7) (2022-02-28)


### Bug Fixes

* refactored crud ops ([e7f3f78](https://github.com/boycce/monastery/commit/e7f3f784e123e4a66586a4d9e733d5cac477b98b))

### [1.31.6](https://github.com/boycce/monastery/compare/1.31.5...1.31.6) (2022-02-25)


### Bug Fixes

* Fixed validateUndefined ([58daed1](https://github.com/boycce/monastery/commit/58daed1ca5317c061a4ddde280bf45b0a134ab30))
* added partial unqiue index tests ([ff6f193](https://github.com/boycce/monastery/commit/ff6f1938e333407ee17895873d2b42fa5263d7e3))
* scripts ([bc32680](https://github.com/boycce/monastery/commit/bc326809098ae24686158a0386fbbd6671d86c98))

### [1.31.5](https://github.com/boycce/monastery/compare/1.31.4...1.31.5) (2022-02-15)


### Bug Fixes

* scripts ([417ba13](https://github.com/boycce/monastery/commit/417ba13c1a0862f76fadf97d6d6d063a74e196bd))

### 1.31.4 (2022-02-15)


### Bug Fixes

* _callAfterFind bug ([e62472c](https://github.com/boycce/monastery/commit/e62472c191119135839b6d9e42b7f060bc7a508d))
* .eslintrc.json ([5362585](https://github.com/boycce/monastery/commit/53625857bbf798db97eddad9385799cb1ded97e2))
* docs ([d8f4e15](https://github.com/boycce/monastery/commit/d8f4e15913f672295cc118fda11ec23a412b4c62))
* docs ([1a5118e](https://github.com/boycce/monastery/commit/1a5118e4b389b55d30bf987991b59638b11613a9))
* docs ([564572c](https://github.com/boycce/monastery/commit/564572ce33dfb35fdd131e81d1dcc655f024b26e))
* docs ([12d37d3](https://github.com/boycce/monastery/commit/12d37d3b2d0b5ec577f9ed4deb9c929c8ea52a36))
* docs and nav links ([0eabcf0](https://github.com/boycce/monastery/commit/0eabcf0cd9a119a6ab1a07b92634e316995a2a83))
* model-crud ([d421709](https://github.com/boycce/monastery/commit/d421709a70e6611c78e049e98268153c9bafae6d))
* normalise afterFind ([0ab7f43](https://github.com/boycce/monastery/commit/0ab7f43f25b599e07d9ae751dc3bac8550e53c24))
* normalised rule arguments and context ([6ba48da](https://github.com/boycce/monastery/commit/6ba48da3b9c643620cebf5442e60bd0318d6780f))
* package scripts ([f7935af](https://github.com/boycce/monastery/commit/f7935afb0181ddb3e397bf804b34c841589dfcf0))
* semver ([6f14909](https://github.com/boycce/monastery/commit/6f14909f4405cf26dc04a8603cc3bac232b96798))
* standard-version ([4627694](https://github.com/boycce/monastery/commit/46276948f76b22eae946147f488c7e734a88c023))
* standard-version ([f553b08](https://github.com/boycce/monastery/commit/f553b08445eb7dd2e85f6bb447e2bb0bc38dda34))
* util bug, updated tests ([bec1887](https://github.com/boycce/monastery/commit/bec1887f56cb8582b606a066c913c191362a61b0))
