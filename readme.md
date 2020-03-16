<h1 align=center>
    <img src="./flavor/cfw-flame-w-lib.svg" type="text/svg" rel="svg" height=80>
</h1>

<h3 align=center>Test Runner</h3>

<p align=center><sub><b>v0.0.1</b></sub></p>

<h6 align=center>

[![Build Status](https://travis-ci.com/CandleFW/test.svg?branch=master)](https://travis-ci.com/CandleFW/test)
[![npm version](https://badge.fury.io/js/%40candlefw%2Ftest.svg)](https://badge.fury.io/js/%40candlefw%2Ftest)

</h6>

CandleFW is a multifaceted library suite with a lot of moving parts. Instead housing tests in individual repo's and needing to test these independently, this library provides tools to create, run, and report tests using the CandleFW library. All existing tests for CFW are housed here, and new tests can be easily implemented and run through the CLI tool this library provides. 

The added benefit is new tests for tools, Plugins, extensions, and Apps utilizing CFW libraries can be made using this tool. 

### Installation


**cfw.test** is available via [npm].
```bash
 $ npm install --global @candlefw/test
```
Also available on yarn 
```bash
 $ yarn global add @candlefw/test
```

## Usage


## Design Goals

- Comprehensive
	- Tests should be able to handle multiple libraries, 3rd party content.
	- It should provide enough information to determine the what, where, when, and how of failed tests.

- Integrable
	- The tests system should be able to be added to existing libraries and run within those libraries, providing enough information to determine whether tests have passed or failed, and were to find the failure locations. 
	- The test system should be able to watch for active file changes and report failures on the spot. 

- Selectable
	- A test suite should be able to be created from configurations files, to allow users to select and isolate testing, even from disparate libraries.



### Clear Error Messages

A primary goal of **cfw.test** is to provide clear, actionable error messages when something fails. Not only errors always presented in to the terminal, they are annotated ways to correct the error. This includes errors caused by **cfw.test** itself. 

For example, should a watched file not be found, the error causes a fatal error, which generates the following message:

```xterm
ENOENT: no such file or directory, watch './test/test.spec'

Cannot continue in watch mode when a watched file cannot be found
```

### Support


__Bugs and requests__: submit them through the project's issues tracker.<br>
[![Issues](http://img.shields.io/github/issues/candlefw/test.svg)]( https://github.com/candlefw/test/issues )

__Questions__: ask them at StackOverflow with the tag **cfw.test**.<br>
[![StackOverflow](http://img.shields.io/badge/stackoverflow-REPO-blue.svg)]( http://stackoverflow.com/questions/tagged/%40candlefw%2Ftest )

__Chat__: join us at gitter.im.<br>
[![Chat](http://img.shields.io/badge/gitter.im-candlefw/test-blue.svg)]( https://gitter.im/candlefw/test )



## License

**cfw.test** **©** **2020** 
Anthony C. Weathersby Released under the [MIT] License.<br>

Authored and maintained by Anthony C. Weathersby.

> GitHub [@acweathersby](https://github.com/acweathersby) &nbsp;&middot;&nbsp;


[npm]: https://www.npmjs.org/package/@candlefw/test
[npm]: https://www.npmjs.org/package/@candlefw/test
[MIT]: http://mit-license.org/
