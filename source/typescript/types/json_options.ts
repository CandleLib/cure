/**
 * Options available for the cfwtest_config.js
 * file.
 */
import { Plugin } from "./plugin";

export interface ConfigFile {
    suite_directory?: string;

    plugins?: Plugin[];
}

