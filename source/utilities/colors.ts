import { xtF, xtColor, xtReset, col_x11, xtBold } from "@candlefw/wax";
export const c_pending = xtF(xtColor(col_x11.Gray30)),
    c_done = xtF(xtColor(col_x11.Grey50)),
    c_success = xtF(xtColor(col_x11.SeaGreen3), xtBold),
    c_fail = xtF(xtColor(col_x11.Red), xtBold),
    c_reset = xtF(xtReset),
    ref = xtF(xtBold, xtColor(col_x11.LightGoldenrod)),
    fail = xtF(xtBold, xtColor(col_x11.SteelBlue1)),
    val = xtF(xtBold, xtColor(col_x11.Chartreuse3)),
    bg = xtF(xtBold, xtColor(col_x11.Gray23)),
    resB = xtF(xtReset),
    rst = xtF(xtReset);
