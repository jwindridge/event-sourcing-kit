# eskit - A framework for building Event Sourced / CQRS Applications

`eskit` (Pronounced 'ess-kit') is a library for building applications that make use of event
sourcing.

Please note that this is a lerna multirepo - individual `@eskit` npm packages are held in the `/packages` directory.

The project makes use of [InversifyJS](https://inversify.io) for managing dependency injection.
This package requires reflection of metadata, and as such a call to `require('reflect-metadata')`
must be made prior to importing eskit package components.

## Installation (Development)

```bash
npm install
lerna bootstrap
```

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on the code of conduct & process for
submitting pull requests.

## Versioning

This repository uses [SemVer]() for versioning. For the available versions, see the [tags on this repository]().

## Authors

- Jonathan Windridge - Project lead - [Trium Capital](https://trium-capital.com)

## License

This project is licensed under the MIT License - see the [LICENSE.md](./LICENSE.md) file for
details.

## Acknowledgements

- [Typescript Starter](https://github.com/bitjson/typescript-starter): This project was bootstraped
  with the excellent Typescript Starter CLI tool.
- [Vaughn Vernon](https://vaughnvernon.co): Inspiration for this project and some of the design
  patterns it implements have been drawn from Vaughn's book "Implementing Domain Driven Design".
- [CQRSHotel](https://github.com/luontola/cqrs-hotel): Inspiration for the API controller /
  Application Service pattern was drawn from the CQRSHotel project
