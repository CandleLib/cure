import { findFile } from "../build/library/utilities/find_file.js";
import URL from "@candlelib/uri";

const
    start1 = URL.resolveRelative("./test/data/search_middle/search_start/"),
    start2 = URL.resolveRelative("./test/data/search_middle/search_start/"),
    root = URL.resolveRelative("./"),
    goal1 = URL.resolveRelative("./LICENSE"),
    goal2 = URL.resolveRelative("./LICENSE"),
    goal3 = URL.resolveRelative("./config.candle.js");

assert(await findFile(/LICENSE/, start1, root) + "" == goal1 + "");

assert(await findFile(/LICENSE/, start2, root) + "" == goal2 + "");

assert(await findFile(/config\.candle\.js/, start2, root) + "" == goal3 + "");