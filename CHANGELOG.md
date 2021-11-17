## [v0.6.2] - 2021-11-17 

- [2021-10-08]

    Made it possible to skip assertion sites within assert_groups and updated BasicReporter to list skipped tests.

- [2021-10-08]

    Fixed issue were the process hung after watch-less test runs due to test runner resources (workers or child-processes) not being released.

## [v0.6.0] - 2021-06-17 

- [2021-06-08]

    Reduced the max amount time the browser runner will pause during test polling to 500ms.

- [2021-06-08]

    Added a sleep period after a file change event is received to prevent stale file data from being resubmitted to the test pipeline.

- [2021-06-08]

    Added CLEAR_SCREEN property to CLITextDraw. If this property is true, then the console is cleared every time CLITextDraw~print is called. Otherwise, the contents of the screen are left in place as new text data is printed.

- [2021-06-08]

    Added sleep timeout before exiting process to allow time to render final text to console

## [v0.5.2] 

- No changes recorded prior to this version.