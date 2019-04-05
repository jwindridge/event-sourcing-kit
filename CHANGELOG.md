# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.7.1"></a>
## [0.7.1](https://github.com/authentik8/event-sourcing-kit/compare/v0.7.0...v0.7.1) (2019-04-05)


### Features

* Add `ApplicationService` abstract class ([32f46ee](https://github.com/authentik8/event-sourcing-kit/commit/32f46ee))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/authentik8/event-sourcing-kit/compare/v0.6.7...v0.7.0) (2019-04-05)


### Features

* Add JsonRpcEndpoint ([051c9e1](https://github.com/authentik8/event-sourcing-kit/commit/051c9e1))



<a name="0.6.7"></a>
## [0.6.7](https://github.com/authentik8/event-sourcing-kit/compare/v0.6.6...v0.6.7) (2019-04-04)



<a name="0.6.6"></a>
## [0.6.6](https://github.com/authentik8/event-sourcing-kit/compare/v0.6.5...v0.6.6) (2019-04-04)



<a name="0.6.5"></a>
## [0.6.5](https://github.com/authentik8/event-sourcing-kit/compare/v0.6.4...v0.6.5) (2019-04-04)



<a name="0.6.4"></a>
## [0.6.4](https://github.com/authentik8/event-sourcing-kit/compare/v0.6.3...v0.6.4) (2019-04-04)



<a name="0.6.3"></a>
## [0.6.3](https://github.com/authentik8/event-sourcing-kit/compare/v0.6.2...v0.6.3) (2019-04-04)


* Update stable branch to v0.4.1 (#8) ([721936b](https://github.com/authentik8/event-sourcing-kit/commit/721936b)), closes [#8](https://github.com/authentik8/event-sourcing-kit/issues/8) [#6](https://github.com/authentik8/event-sourcing-kit/issues/6)


### BREAKING CHANGES

* Changed package name to `eskit`

* bug: InMemoryStore data storage

InMemoryStore wasn't appending to `this._allData`, so `readAllRecords` always
returned an empty array

* test(infra/storage): Use typed Ava contexts

* chore: Update package name in package-lock.json

* test(infra): Add unit tests for EventStore

* Add types declaration for "@elastic.io/amqp-rpc"

* Add amqp dependencies

* Improve domain service registry injection pattern

* Replace servicebus implementation with amqp-rpc

* Add rudimentary implementation of RPC Command Adapter

* Fix minor typos & formattting

* Make type parameter of RpcCommandAdapter generic

* Add `AggregateRepository.getNextId` functionality

* Simplify interface for RpcCommandAdapter



<a name="0.6.2"></a>
## [0.6.2](https://github.com/authentik8/event-sourcing-kit/compare/v0.6.1...v0.6.2) (2019-04-04)



<a name="0.6.1"></a>
## [0.6.1](https://github.com/authentik8/event-sourcing-kit/compare/v0.6.0...v0.6.1) (2019-04-03)


### Features

* Add SQLProjection.ready() function ([e5e0800](https://github.com/authentik8/event-sourcing-kit/commit/e5e0800))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/authentik8/event-sourcing-kit/compare/v0.5.1...v0.6.0) (2019-04-03)


### Features

* Refactor command & query envelopes ([2ead391](https://github.com/authentik8/event-sourcing-kit/commit/2ead391))



<a name="0.5.1"></a>
## [0.5.1](https://github.com/authentik8/event-sourcing-kit/compare/v0.5.0...v0.5.1) (2019-04-03)



<a name="0.5.0"></a>
# [0.5.0](https://github.com/authentik8/event-sourcing-kit/compare/v0.4.1...v0.5.0) (2019-04-03)


* Release v0.4.0 (#7) ([8b32314](https://github.com/authentik8/event-sourcing-kit/commit/8b32314)), closes [#7](https://github.com/authentik8/event-sourcing-kit/issues/7)


### Features

* Expose commands on AggregateRoot ([9b50098](https://github.com/authentik8/event-sourcing-kit/commit/9b50098))


### BREAKING CHANGES

* Changed package name to `eskit`
* Changed names of a number of imports


<a name="0.4.1"></a>
## [0.4.1](https://github.com/authentik8/event-sourcing-kit/compare/v0.4.0...v0.4.1) (2019-03-27)


### Bug Fixes

* Stale knex querybuilder instance ([a8ba033](https://github.com/authentik8/event-sourcing-kit/commit/a8ba033))
* Wrong column identifier used in knex update ([d25ab52](https://github.com/authentik8/event-sourcing-kit/commit/d25ab52))


<a name="0.4.0"></a>
# [0.4.0](https://github.com/authentik8/event-sourcing-kit/compare/v0.2.0...v0.4.0) (2019-03-26)


### Features

* Rename to `eskit` ([9c1c79a](https://github.com/authentik8/event-sourcing-kit/commit/9c1c79a))
* Restructure library ([#6](https://github.com/authentik8/event-sourcing-kit/issues/6)) ([12242fe](https://github.com/authentik8/event-sourcing-kit/commit/12242fe))


### BREAKING CHANGES

* Changed package name to `eskit`



<a name="0.3.0"></a>
# [0.3.0](https://github.com/authentik8/event-sourcing-kit/compare/v0.2.0...v0.3.0) (2019-03-22)


### Features

* Add EventPublisher ([606bdf0](https://github.com/authentik8/event-sourcing-kit/commit/606bdf0))
* Add EventSubscriber ([f6f6ae7](https://github.com/authentik8/event-sourcing-kit/commit/f6f6ae7))
* Rename to `eskit` ([9c1c79a](https://github.com/authentik8/event-sourcing-kit/commit/9c1c79a))


### BREAKING CHANGES

* Changed package name to `eskit`



<a name="0.2.0"></a>
# [0.2.0](https://github.com/authentik8/event-sourcing-kit/compare/v0.1.3...v0.2.0) (2019-03-15)


### Features

* Add commands list to aggregate ([#4](https://github.com/authentik8/event-sourcing-kit/issues/4)) ([33bc09a](https://github.com/authentik8/event-sourcing-kit/commit/33bc09a))
* Add list of commands to IAggregate ([#3](https://github.com/authentik8/event-sourcing-kit/issues/3)) ([c03a22f](https://github.com/authentik8/event-sourcing-kit/commit/c03a22f))



<a name="0.1.3"></a>
## [0.1.3](https://github.com/authentik8/event-sourcing-kit/compare/v0.1.2...v0.1.3) (2019-03-15)



<a name="0.1.2"></a>
## [0.1.2](https://github.com/authentik8/event-sourcing-kit/compare/v0.1.1...v0.1.2) (2019-03-14)



<a name="0.1.1"></a>

## 0.1.1 (2019-03-14)

### Features

- Implement Domain helpers
- Implement Application helpers
- Implement Infrastructure helpers
