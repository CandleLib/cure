#!/usr/bin/env node
import { test } from "../build/library/test.js";
import { getProcessArgs } from "@candlefw/wax";


const
	args = getProcessArgs(),
	files = args.__array__.filter(a => a.hyphens == 0).map(a => a.name),
	WATCH = !!(args.watch || args.w);

test(WATCH, ...files);