# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="2.1.1"></a>

## [2.1.1](https://github.com/authentik8/event-sourcing-kit/compare/v2.1.0...v2.1.1) (2019-04-26)

### Bug Fixes

- **eventstore:** Add missing commits ([dab0f31](https://github.com/authentik8/event-sourcing-kit/commit/dab0f31))

<a name="2.1.0"></a>

# [2.1.0](https://github.com/authentik8/event-sourcing-kit/compare/v2.0.3...v2.1.0) (2019-04-26)

### Features

- **eventstore:** Allow storing of event metadata ([2bf6db3](https://github.com/authentik8/event-sourcing-kit/commit/2bf6db3))

<a name="2.0.3"></a>

## [2.0.3](https://github.com/authentik8/event-sourcing-kit/compare/v2.0.2...v2.0.3) (2019-04-24)

<a name="2.0.2"></a>

## [2.0.2](https://github.com/authentik8/event-sourcing-kit/compare/v2.0.1...v2.0.2) (2019-04-24)

### Bug Fixes

- Don't change case of commands / events ([825e0da](https://github.com/authentik8/event-sourcing-kit/commit/825e0da))

<a name="2.0.1"></a>

## [2.0.1](https://github.com/authentik8/event-sourcing-kit/compare/v2.0.0...v2.0.1) (2019-04-24)

### Bug Fixes

- Remove unneeded servicebus dependency ([d699c8e](https://github.com/authentik8/event-sourcing-kit/commit/d699c8e))

<a name="2.0.0"></a>

# [2.0.0](https://github.com/authentik8/event-sourcing-kit/compare/v1.3.0...v2.0.0) (2019-04-24)

### Features

- Add id to domain entity state ([b637fce](https://github.com/authentik8/event-sourcing-kit/commit/b637fce))

### BREAKING CHANGES

- `AggregateRoot` objects have had `initialState`
  replaced with `getInitialState(id: string)`

<a name="1.3.0"></a>

# [1.3.0](https://github.com/authentik8/event-sourcing-kit/compare/v1.2.5...v1.3.0) (2019-04-17)

### Features

- Add hook for user id retrieval ([a02c876](https://github.com/authentik8/event-sourcing-kit/commit/a02c876))

<a name="1.2.5"></a>

## [1.2.5](https://github.com/authentik8/event-sourcing-kit/compare/v1.2.4...v1.2.5) (2019-04-12)

### Bug Fixes

- Add userId as optional arg to `createCommand` ([afb2de6](https://github.com/authentik8/event-sourcing-kit/commit/afb2de6))

<a name="1.2.4"></a>

## [1.2.4](https://github.com/authentik8/event-sourcing-kit/compare/v1.2.3...v1.2.4) (2019-04-12)

<a name="1.2.3"></a>

## [1.2.3](https://github.com/authentik8/event-sourcing-kit/compare/v1.2.2...v1.2.3) (2019-04-12)

<a name="1.2.2"></a>

## [1.2.2](https://github.com/authentik8/event-sourcing-kit/compare/v1.2.1...v1.2.2) (2019-04-12)

<a name="1.2.1"></a>

## [1.2.1](https://github.com/authentik8/event-sourcing-kit/compare/v1.2.0...v1.2.1) (2019-04-12)

<a name="1.2.0"></a>

# [1.2.0](https://github.com/authentik8/event-sourcing-kit/compare/v1.1.0...v1.2.0) (2019-04-09)

### Features

- **domain:** Add command validation ([2a7a34d](https://github.com/authentik8/event-sourcing-kit/commit/2a7a34d))

<a name="1.1.0"></a>

# [1.1.0](https://github.com/authentik8/event-sourcing-kit/compare/v0.7.2...v1.1.0) (2019-04-08)

### Features

- **domain:** Allow multiple command handlers ([76bf79e](https://github.com/authentik8/event-sourcing-kit/commit/76bf79e))

<a name="1.0.0"></a>

# [1.0.0](https://github.com/authentik8/event-sourcing-kit/compare/v0.7.2...v1.0.0) (2019-04-05)
