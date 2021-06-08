import { findFile, fsp } from "../build/library/utilities/find_file.js";
import URL from "@candlelib/uri";
import { getPackageJsonObject } from "@candlelib/paraffin";
import { assert } from "console";
import { ext, parser as js_parser, renderWithFormatting } from "@candlelib/js";
import { parser as ts_parser, renderWithFormatting as renderWithFormattingTS, TS_to_JSNodeDefinitions } from "@candlelib/ts";

assert_group(
    "Loads, Parses, Executes, and Integrates Config Files constructed with TypeScript or JavaScript syntaxes",
    () => {

        const { package: pkg, FOUND, package_dir } = await getPackageJsonObject(URL.resolveRelative("./"));

        // Look for plugin file in local directory, but only 
        // in directories that are part of the package.

        // Look for plugin file in local directory, but only 
        // in directories that are part of the package.

        let
            config_file_url_ts = null,
            config_file_url_js = null;

        if (FOUND) {
            config_file_url_ts = await findFile(/config\.candle\.(ts)/, new URL(package_dir));
            config_file_url_js = await findFile(/config\.candle\.(ts)/, new URL(package_dir));
        }

        assert("Is able to locate TypeScript Config File", config_file_url_ts != null);
        assert("Is able to locate JavaScript Config File", config_file_url_js != null);

        assert_group(solo, inspect, "Loads Typescript Configuration", sequence, () => {

            //Converting to JS file ATM until better TS support is included
            const file = await config_file_url_ts.fetchText();

            assert(file != "");

            const tsAST = ts_parser(file).ast;

            assert(tsAST != null);

            const js_file = renderWithFormattingTS(tsAST, true);

            assert(js_file != "");

            //write temp file to temporary directory

            const temp = URL.resolveRelative("./~temp-test/config.js");
            const temp_dir = URL.resolveRelative("./~temp-test/");

            await fsp.mkdir(temp_dir + "", { recursive: true });
            await fsp.writeFile(temp + "", js_file);

            //load the temp file as a module

            const script = await import(temp + "");
            //
            console.log(script);
            //
            assert(inspect, script != null);



        });

        assert_group("Loads Javascript Configuration", sequence, () => {
            assert(1 == 3);
        });
    }
);