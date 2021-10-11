<h1 align=center>CandleLibrary Cure</h1>

<h3 align=center>JavaScript Testing</h3>

<p align=center> <img alt="npm (tag)" src="https://img.shields.io/npm/v/@candlelib/cure?style=for-the-badge&logo=appveyor"> </p>

### Cure is a testing framework that aims to be:

- #### Easy To Use
    A minimal amount of code should be required to run a test. Cure should be able to understand a codebase and pull in requirements automatically
    
    Should provide accurate feed back when a failure has been encountered in order to make quick decisions on how to correct the problem and meet the specification.

- #### Highly Configurable
    Cure should be able handle the requirements of  an evolving code base. Cure sure should be easily adaptable to existing projects while
    also allowing new projects to work with it minimal, ideally no, boilerplate.  

    Additional features should be able to be added through a rich plugin system that that is simple to use.

- #### Fun 
    Most importantly, making tested code work should be rewarding. It should provide a nostalgia
for a person's early days, when the first `Hello World` message was printed, and that person became a *programmer*. 



# State of the Framework

Cure is experimental but relatively stable, however there is no release available yet. There will be an alpha release before end
of Feb 2021

Most of the development work is going into supporting a plugin system, which means the core architecture is mostly finalized. 
There are frequent updates to this framework, so watch this project if you want to see what comes about.

# Usage

### Install

#### Yarn
```bash
$ yarn global add @candlelib/cure
```
#### NPM
```bash
$ npm install -g @candlelib/cure
```


### Run 

Single file execution with that will watch imported files

```bash
$ cure --watch ./test/test.spec.js
```
# Spec Files

# Commandline Interface

## Config Script

A configuration script can be included to handle the task of loading  data

# Plugins

### Reporters
### 


# Tips & Tricks

## Side effects

Make sure expressions in assertions sites do not have side effects or are placed in 
sequenced assertion groups, otherwise an assertion will if it relies on those side 
effects:

```Typescript
let a = 0;

assert( a++ == 0 ) // Will pass

assert( a++ == 1) // Will fail. 

// The effect of the first assertion 
// is not seen by the second
```

This is because Cure isolates assertions by removing all expressions and statements
that do not directly effect the outcome of the assertion, including other assertion
statement. If an assertion site makes a modification to an object that a subsequent 
assertion site relies on, the latter site will fail due to effect of the former one 
being present in the execution context. 


To overcome this problem, either ensure assertions do not modify their references, or
wrap them in an `assert_group`:

```Typescript

let a = 0;

assert_group(sequence, ()=>{

    assert( a++ == 0 ) // Will pass

    assert( a++ == 1) // Will also pass

    // The second assertion can now see the 
    // effects of the first one
})

```
