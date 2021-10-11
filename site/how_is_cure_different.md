# How Is This Different From Other Test Frameworks, Such As Mocha

Cure follows a very similar pattern to Mocha when it comes to testing. A test file is defined that contains function calls to the 
test framework in order to declare such things as test suites, test cases, assertions and cleanup and tear
down code. Tests are then collated, sorted, filtered, and then are run in an isolated environment. 
During the test run and upon completion, results from the tests are made available for review and reporting. 

Where Cure differs is it compiles tests *ahead of time*. Instead of importing scripts and running code within
those scripts to find tests, suites, and other test related constructs, Cure simply reads the scripts text data and
compiles source code that can then be submitted to various endpoints to run. Only the code that is directly
related to an assertion is included. This allows test to be lean, discarding any code that is not needed, 
instrumented, and arbitrarily run.
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