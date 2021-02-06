# CANDLELIB::CURE

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


### Yes But...

#### How Is This Different From Other Test Frameworks, Such As Mocha

Cure follows a very similar pattern to Mocha when it comes to testing. A test file is defined that contains function calls to the 
test framework in order to declare such things as test suites, test cases, assertions and cleanup and tear
down code. Tests are then collated, sorted, filtered, and then are run in an isolated environment. 
During the test run and upon completion, results from the tests are made available for review and reporting. 

Where Cure differs is it compiles tests *ahead of time*. Instead of importing scripts and running code within
those scripts to find tests, suites, and other test related constructs, Cure simply reads the scripts text data and
compiles source code that can then be submitted to various endpoints to run. Only the code that is directly
related to an assertion is included. This allows test to be lean, discarding any code that is not needed, 
instrumented, and arbitrarily run.

##### Additional Features:

- References required by a test need not declared within a specific "test" function. As each assertion is
  able to run in isolation, they will receive a unique copy of a reference that is unpolluted from other
  assertions within the same test script.
- Any reference can be inspected to get detailed information of their values during testing; 
- Assertions in the same spec file that are required to run in a different environnement can be submitted independently 
  to a suitable test runner, including over a network. This means assertions that need to run within a browser can
  defined within the same file that includes assertions made for server/desktop land.
- <sup style="color:rgb(200,100,80);">**`NOT YET IMPLEMENTED`**</sup> Inline tests can be defined within source code 
  without any extra tooling and Cure will be able to detect and run them as the source is modified.
- <sup style="color:rgb(200,100,80);">**`NOT YET IMPLEMENTED`**</sup> Cure can infer object references and automatically 
import objects from other project files or dependencies, allow you to write test code without worrying on the minutia
of dependency management.
- Asynchronous tests can be automatically detected and run without any special changes.

# State of the Framework

Cure is experimental but relatively stable, however there is no release available yet. There will be an alpha release before end
of Feb 2021

Most of the development work is going into supporting a plugin system, which means the core architecture is mostly finalized. 
There are frequent updates to this framework, so watch this project if you want to see what comes about.
