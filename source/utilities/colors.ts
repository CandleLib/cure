import { xtF, xtColor, xtReset, color, xtBold } from "@candlefw/wax";
export const c_pending = xtF(xtColor(color.gray30)),
    c_done = xtF(xtColor(color.grey50)),
    c_success = xtF(xtColor(color.seagreen3), xtBold),
    c_fail = xtF(xtColor(color.rosybrown), xtBold),
    c_reset = xtF(xtReset),
    ref = xtF(xtBold, xtColor(color.lightgoldenrod2)),
    fail = xtF(xtBold, xtColor(color.steelblue1)),
    val = xtF(xtBold, xtColor(color.chartreuse3)),
    bg = xtF(xtBold, xtColor(color.gray23)),
    bg2 = xtF(xtColor(color.lightpink3)),
    resB = xtF(xtReset),
    rst = xtF(xtReset);
