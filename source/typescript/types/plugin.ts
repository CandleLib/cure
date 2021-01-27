import { ExpressionHandler } from "./expression_handler";
import { Reporter } from "./reporter";
import { TestRunner } from "./test_runner";

export enum PluginType {
    Reporter = "CFW_TEST_REPORTER_PLUGIN",
    Runner = "CFW_TEST_RUNNER_PLUGIN",
    ExpressionHandler = "CFW_TEST_EXPRESSION_HANDLER_PLUGIN"
}

export interface Plugin {
    type: PluginType;

    plugin: ExpressionHandler | Reporter | TestRunner;
}

export interface ExpressionHandlerPlugin extends Plugin {

    type: PluginType.ExpressionHandler;

    plugin: ExpressionHandler;
}

export interface ReporterPlugin extends Plugin {

    type: PluginType.Reporter;

    plugin: Reporter;
}

export interface RunnerPlugin extends Plugin {

    type: PluginType.Runner;

    plugin: TestRunner;
}
