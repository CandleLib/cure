import { xtF, xtColor, xtReset, col_x11, xtBold } from "@candlelib/paraffin";

export const
    rst = xtF(xtReset),
    /**
     * Background color for characters of minimal importance.
     */
    bkgr = xtF(xtColor(col_x11.Gray19)),
    /**
     * Color to denote test failure.
     */
    fail = xtF(xtColor(col_x11.Red)),

    /**
     * Color to denote test success.
     */
    pass = xtF(xtColor(col_x11.DarkOliveGreen1)),

    /**
     * Color to denote skipped test.
     */
    skip = xtF(xtColor(col_x11.DarkGray)),

    /**
     * General color to highlight an object name such as a member expression or variable.
     */
    objA = xtF(xtColor(col_x11.Orange)),
    /**
     * General color to highlight an object name such as a member expression or variable.
     */
    objB = xtF(xtColor(col_x11.Aquamarine1)),
    /**
     * General color to highlight an object name such as a member expression or variable.
     */
    objC = xtF(xtColor(col_x11.MediumPurple2)),
    /**
     * General color to highlight an object name such as a member expression or variable.
     */
    objD = xtF(xtColor(col_x11.CornflowerBlue)),
    /**
     * General color to highlight an literal value, such 0, true, null, undefined
     */
    valA = xtF(xtColor(col_x11.LightGreen)),
    /**
     * General color to highlight an literal value, such 0, true, null, undefined
     */
    valB = xtF(xtColor(col_x11.CadetBlue4)),
    /**
     * General color to highlight an literal value, such 0, true, null, undefined
     */
    valC = xtF(xtColor(col_x11.DarkSlateBlue)),
    /**
     * General color to highlight an literal value, such 0, true, null, undefined
     */
    valD = xtF(xtColor(col_x11.SlateGray2)),
    /**
     * Neutral color to highlight a message such a as tip.
     */
    msgA = xtF(xtColor(col_x11.Gray69)),
    /**
     * Neutral color to highlight a message such a as tip.
     */
    msgB = xtF(xtColor(col_x11.Grey50)),
    /**
     * Neutral color to highlight a message such a as tip.
     */
    msgC = xtF(xtColor(col_x11.Gray61)),
    /**
     * Neutral color to highlight a message such a as tip.
     */
    msgD = xtF(xtColor(col_x11.Grey50)),
    /**
     * Highlight color to highlight a non test symbol.
     */
    symA = xtF(xtColor(col_x11.Gold), xtBold),
    /**
     * Highlight color to highlight a non test symbol.
     */
    symB = xtF(xtColor(col_x11.Gold3), xtBold),
    /**
     * Highlight color to highlight a non test symbol.
     */
    symC = xtF(xtColor(col_x11.OrangeRed2), xtBold),
    /**
     * Highlight color to highlight a non test symbol.
     */
    symD = xtF(xtColor(col_x11.LightSkyBlue2), xtBold);