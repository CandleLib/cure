import { buildParserMemoryBuffer, loadWASM } from "@candlelib/hydrocarbon/build/library/runtime.js";
import Lexer from "@candlelib/wind";

const debug_stack = [];
const { shared_memory, action_array, error_array } = buildParserMemoryBuffer(false, 4194304, 163920);

const data = (str => { const out = new Uint8Array(str.length >> 1); for (let i = 0; i < str.length; i += 2) { out[i >> 1] = parseInt(str.slice(i, i + 2), 16); } return out; })(
    "0061736d0100000001300960027f7f017f60017f017f60017f0060027f7f0060037f7f7f0060037f7f7f017f60000060047f7f7f7f006000017f021c0203656e760561626f7274000703656e76066d656d6f727902014964033534030304060100040000"
    + "010403050001020800010101020305010100010101040205000000000000000000000100050000000101020622067f0141000b7f0141000b7f0141000b7f0141000b7f0141000b7f004190b2a1020b074807066d656d6f72790200055f5f6e6577000907"
    + "5f5f72656e6577000e085f5f72657461696e000f095f5f72656c6561736500100b5f5f727474695f626173650305046d61696e00330a933e349b0201047f20012802002202410171450440410041f0b1a102419002410e1000000b2002417c71220241fc"
    + "ffffff034941002002410c4f1b450440410041f0b1a102419202410e1000000b200241800249044020024104762102052002411f2002676b220341046b764110732102200341076b21030b2002411049410020034117491b450440410041f0b1a102419f"
    + "02410e1000000b20012802082104200128020422050440200520043602080b20040440200420053602040b20012000200220034104746a4102746a2802604604402000200220034104746a4102746a20043602602004450440200020034102746a220428"
    + "0204417e20027771210120042001360204200145044020002000280200417e200377713602000b0b0b0b8b0401077f2001450440410041f0b1a10241c801410e1000000b20012802002204410171450440410041f0b1a10241ca01410e1000000b200141"
    + "046a2001280200417c716a2205280200220241017104402004417c7141046a2002417c716a220341fcffffff03490440027f200020051001200120032004410371722204360200200141046a2001280200417c716a22052802000b21020b0b2004410271"
    + "0440027f200141046b28020022032802002207410171450440410041f0b1a10241df0141101000000b2007417c7141046a2004417c716a220841fcffffff0349047f20002003100120032008200741037172220436020020030520010b0b21010b200520"
    + "024102723602002004417c71220341fcffffff034941002003410c4f1b450440410041f0b1a10241ee01410e1000000b2003200141046a6a2005470440410041f0b1a10241ef01410e1000000b200541046b200136020020034180024904402003410476"
    + "2103052003411f2003676b220441046b764110732103200441076b21060b2003411049410020064117491b450440410041f0b1a10241ff01410e1000000b2000200320064104746a4102746a280260210420014100360204200120043602082004044020"
    + "0420013602040b2000200320064104746a4102746a200136026020002000280200410120067472360200200020064102746a220020002802044101200374723602040bda0101027f200120024b0440410041f0b1a10241fc02410e1000000b200141136a"
    + "41707141046b21012002417071210320002802a00c220204402001200241046a490440410041f0b1a10241830341101000000b2002200141106b460440027f20022802002104200141106b0b21010b052001200041a40c6a490440410041f0b1a1024190"
    + "0341051000000b0b200320016b220241144904400f0b20012004410271200241086b22024101727236020020014100360204200141003602082002200141046a6a22024102360200200020023602a00c2000200110020b9f0101027f3f00220041c90048"
    + "047f41c90020006b40004100480541000b0440000b41c0b2a102410036020041e0bea1024100360200034020014117490440200141027441c0b2a1026a410036020441002100034020004110490440200020014104746a41027441c0b2a1026a41003602"
    + "60200041016a21000c010b0b200141016a21010c010b0b41c0b2a10241e4bea1023f00411074100341c0b2a10224000b3300200041fcffffff034f044041f0b0a10241f0b1a10241cd03411e1000000b410c200041136a41707141046b2000410c4d1b0b"
    + "e00101017f20014180024904402001410476210105411f20014101411b2001676b746a41016b2001200141feffffff01491b2201676b21022001200241046b764110732101200241076b21020b2001411049410020024117491b450440410041f0b1a102"
    + "41cd02410e1000000b200020024102746a280204417f200174712201047f200020016820024104746a4102746a280260052000280200417f200241016a74712201047f200020016822014102746a2802042202450440410041f0b1a10241da0241121000"
    + "000b200020026820014104746a4102746a2802600541000b0b0b8c0101027f20012802002103200241046a410f710440410041f0b1a10241e802410e1000000b2003417c7120026b220441104f0440200120022003410271723602002002200141046a6a"
    + "2201200441046b4101723602002000200110020520012003417e71360200200141046a22002001280200417c716a20002001280200417c716a280200417d713602000b0bc60101027f20002001100522021006220145044041043f00220141107441046b"
    + "20002802a00c477420024101411b2002676b7441016b6a2002200241feffffff01491b6a41ffff036a4180807c71411076210320012003200120034a1b40004100480440200340004100480440000b0b200020014110743f004110741003200020021006"
    + "2201450440410041f0b1a10241f20341101000000b0b20022001280200417c714b0440410041f0b1a10241f403410e1000000b200020011001200020012002100720010b6001027f200041ecffffff034b044041f0b0a10241b0b1a102419302411e1000"
    + "000b200041106a2102230045044010040b23002002100841046a220341046b22024100360204200241003602082002200136020c20022000360210200341106a0b3a01017f200041046b21012000410f7145410020001b047f2001280200410171450541"
    + "000b450440410041f0b1a10241b30441031000000b20010bb00201027f02402002210420002001460d0020002001490440200141077120004107714604400340200041077104402004450d04200441016b21042000220241016a21002001220341016a21"
    + "01200220032d00003a00000c010b0b0340200441084f044020002001290300370300200441086b2104200041086a2100200141086a21010c010b0b0b0340200404402000220241016a21002001220341016a2101200220032d00003a0000200441016b21"
    + "040c010b0b05200141077120004107714604400340200020046a41077104402004450d04200441016b220420006a200120046a2d00003a00000c010b0b0340200441084f0440200441086b220420006a200120046a2903003703000c010b0b0b03402004"
    + "0440200441016b220420006a200120046a2d00003a00000c010b0b0b0b0b1500200120012802004101723602002000200110020b2f00200020021008220241046a200141046a2001280200417c71100b200141b4b2a1024f044020002001100c0b20020b"
    + "e00101077f200141ecffffff034b044041f0b0a10241b0b1a10241a002411e1000000b200041106b2100230045044010040b200141106a2102200041b4b2a10249044023002000100a2002100d2100050240230021032000100a21000240200210052205"
    + "20002802002206417c7122044d0d00200041046a2000280200417c716a2207280200220841017104402005200441046a2008417c716a22044d0440200320071001200020042006410371723602000c020b0b200320002002100d21000c010b2003200020"
    + "0510070b0b200041046a220041046b2001360210200041106a0b6701027f200041b4b2a1024b0440200041146b2201280204220241808080807f71200241016a41808080807f71470440410041b0b1a10241ed0041031000000b2001200241016a360204"
    + "20012802004101710440410041b0b1a10241f000410e1000000b0b20000b1400200041b4b2a1024b0440200041146b10340b0b5401017f411441031009100f2200410036020020004100360204200041003602082000410036020c200041003602102000"
    + "410036020020004100360204200041003602082000410036020c2000410036021020000b7101027f200041146b28021041017622022103200120024f0440417f0f0b41012003200141016a46200020014101746a2f010022024180f803714180b003471b"
    + "044020020f0b200020014101746a2f010222004180f803714180b80347044020020f0b20002002410a746a4180c880656a0b36000240024002400240024020004101742f010041ff017141016b0e050102030304000b41100f0b41040f0b41010f0b4108"
    + "0f0b41020b71002000200028020820002802046a360208200041013602042000280208230341146b2802104101764e044020004100360200200041003602042000417f36020c2000230341146b2802104101763602080520002303200028020810123602"
    + "0c2000200028020c10133602000b2000100f0b20002000100f21000340200028020041014604402000101410100c010b0b20000b1c01017f2301220141016a240120014102744180b0176a20003602000b8a0101037f2000100f22032802082003280210"
    + "6b22004103744101722104027f20004100472202047f200041ff9f024b2200047f200005200141ff9f024b0b0541000b0440027f2003410010174101210441000b21020b20020b41027420014100474101747220012002410f6c41036a74722004721016"
    + "2003200328020820032802046a360210200310100b4d002000100f210020014101714504402000101041000f0b200204402000100f2102200141027104402002200228020410170b20021014101020021010200010100520001010410021010b20010b2e"
    + "002000100f210003402000280200410846047f41010520002802004101460b04402000101410100c010b0b20000b8f0201017f2000100f210023032000280208410a6a1012413e46047f2303200028020841096a101241f300460541000b047f23032000"
    + "28020841086a101241f500460541000b047f2303200028020841076a101241ef00460541000b047f2303200028020841066a101241ed00460541000b047f2303200028020841056a101241f900460541000b047f2303200028020841046a101241ee0046"
    + "0541000b047f2303200028020841036a101241ef00460541000b047f2303200028020841026a101241ee00460541000b047f2303200028020841016a101241e100460541000b047f230320002802081012413c460541000b047f20004110360200200041"
    + "0b36020441010541000b21012000101020010b7101017f2000100f220028020c220241204804402000101041000f05200241c0004804402000101020014101200241206b74714100470f05200241e000480440200010104101200241406a744180808080"
    + "78714100470f0520024180014804402000101041000f0b0b0b0b2000101041000b6601027f20002802004104460440230341146b280210410176210220002802082101200041013602040340200141016a2201200248047f2303200110124101742f0100"
    + "4108764106710541000b04402000200028020441016a3602040c010b0b41010f0b41000b20002000100f21000340200028020041084604402000101410100c010b0b20000b6601027f20002802004102460440230341146b280210410176210220002802"
    + "082101200041013602040340200141016a2201200248047f2303200110124101742f01004108764104710541000b04402000200028020441016a3602040c010b0b41010f0b41000b1c0020004102710440200141ffff007141027420024110747210160b"
    + "0b2801017f23024194c0024f04400f0b2302220141016a240220014102744180b097026a20003602000b4c002000100f2100200141017145410120021b04402000100f21022001410271410020014101711b04402002100f22012802081020200110100b"
    + "200210102000101041000f0b2000101020010b9f0101017f2000100f220228020c41df0046047f410105200228020c4124460b047f4101052002101c0b2100200220012000101804402002100f21000240024003402000101d101020002802004101460d"
    + "012000200120004190c000101b047f4101052000101c0b047f4101052000101e0b10180440200141024101101f0c010b0b200020014101102121010b200010100b2002101020010f0b2002101041000bbb0101017f0240027f027f2000100f2200100f22"
    + "0220011022220104402002101020010c010b2002101041000b220104402000101d101020002001200028020c412e461018450d02024020001019101020002001200028020c41db0046101804402000101910102000200110232201044020001019101020"
    + "002001200028020c41dd004610180440200141054110101f0c060b0b052000200110232201044020014103410f101f0c050b0b0b0b2000101041000b0f0b2000101020010b46002000100f220020011023220104402000101d1010200020012000280200"
    + "41014610180440200141024108101f05200141014108101f0b2000101020010f0b2000101041000b7101017f2000100f22022001102f22000440200041014104101f2002100f2101034020011019101020012000200128020c412c461018044020011019"
    + "101020012000102f22000440200041034103101f0c020b0b0b20012000410110212100200110102002101020000f0b2002101041000b4c01017f2000100f220028020c412e46047f410105200028020c412f460b047f4101052000101c0b047f41010520"
    + "00101e0b2102200020012002101804402000101020010f0b2000101041000bd00101027f2000100f22022001200228020c412f461018044020021019101002402002100f22032001102622000440200041014102101f2003100f21010240024003402001"
    + "1015101020012802004108460d01200128020c412e46047f410105200128020c412f460b047f4101052001101c0b047f4101052001101e0b044020012000102622000440200041024101101f0c020b0b0b200120004101102121000b200110100b200310"
    + "100c010b20031010410021000b20000440200041024101101f2002101020000f0b0b2002101041000b4c01017f2000100f220028020c412e46047f410105200028020c412d460b047f4101052000101c0b047f4101052000101e0b210220002001200210"
    + "1804402000101020010f0b2000101041000b860301037f02402000100f2202100f220020012000101c101804402000101d101020002001200028020c413a46101804402000101d10102000100f21032303200328020841016a1012412f46047f23032003"
    + "2802081012412f460541000b047f200341103602002003410236020441010541000b2104200310102000200120041018044020014103410f101f200010100c030b0b0b20001010410021010b20010440200210191010200228020c412e46047f41010520"
    + "0228020c412d460b047f4101052002101c0b047f4101052002101e0b044002402002100f22032001102822000440200041014102101f2003100f21010340200110191010200128020c412e46047f410105200128020c412d460b047f4101052001101c0b"
    + "047f4101052001101e0b044020012000102822000440200041024101101f0c020b0b0b2001200041011021210020011010200310100c010b20031010410021000b20000440200041024101101f2002101020000f0b05200141014108101f200210102001"
    + "0f0b0b2002101041000b6b002000100f22002001200028020c413a4610180440200010191010200020012000101e10180440200010151010200028020c413a46044020002001102a2201044020014103410b101f2000101020010f0b0520014102410c10"
    + "1f2000101020010f0b0b0b2000101041000bde0101037f02402000100f2203100f220420012004101a10180440200410100c010502402004100f220228020c412f4604402002200110272200044020004101410e101f200210100c020b05200220011029"
    + "220004402002101910102002200010272200044020004102410d101f200210100c030b0b0b20021010410021000b2000044020041010200021010c020b0b20041010410021010b20010440200310151010200328020c413a46044020032001102a220004"
    + "40200041024109101f2003101020000f0b0520014101410a101f2003101020010f0b0b2003101041000b5701027f02400240024023040e020102000b000b1011220221010b2001100f2201200028020c36020c2001200028020036020020012000280204"
    + "36020420012000280208360208200120002802103602102002101020010bca0201027f0240027f2000100f220028020c41df0046047f410105200028020c4124460b04402000200110242201044020001019101020002001200028020c41284610180440"
    + "2000101910102000200110252201044020001019101020002001200028020c41294610180440200141044107101f2000101020010f0b0b0b0b052000101a047f410105200028020c412f460b044020002001102b220104402000101020010f0b05200010"
    + "1c0440410024042000102c220210142203101d1010200228020c413a46044020002001102b22010d05052000200110242201044020001019101020002001200028020c412846101804402000101910102000200110252201044020001019101020002001"
    + "200028020c41294610180440200141044107101f0c090b0b0b0b0b20021010200310100b0b0b2000101041000b0f0b20001010200210102003101020010bf10301027f2000100f2100034002400240024002402002410b470440200241186b0e03010203"
    + "040b2000101910102000100f21032303200328020841016a101241f40046047f23032003280208101241e100460541000b047f200341103602002003410236020441010541000b2104200310102000200120041018044020001019101020002001102d22"
    + "010440200141034105101f410821020c060b0520002001200028020c412846101804402000101910102000200110252201044020001019101020002001200028020c41294610180440200141044107101f410821020c080b0b0b0b0c030b2000101d1010"
    + "20002001200028020041014610180440200141024108101f05200141014108101f0b410b21020c030b2000101d101020002001200028020c412e461018044020001019101020002001200028020c41db0046101804402000101910102000200110232201"
    + "044020001019101020002001200028020c41dd004610180440200141054110101f411821020c060b0b052000200110232201044020014103410f101f411821020c050b0b05411821020c030b0c010b2000101d10102000200120004190c000101b047f41"
    + "01052000101c0b047f4101052000101e0b1018047f200141024101101f411a0541190b21020c010b0b200020012002410846102121012000101020010b830301037f2000100f22022104027f41002002100f220328020841026a2200230341146b280210"
    + "4101764e0d001a23032000101210130b410447047f2303200328020841016a101241f40046047f23032003280208101241e100460541000b0541000b047f200341103602002003410236020441010541000b210020031010024002402004200120001018"
    + "044020021019101020022001102d22000440200041024106101f0c020b05200228020c41df0046047f410105200228020c4124460b04402002200110222200044020022000411a102e21002002101020000f0b052002101a047f410105200228020c412f"
    + "460b044020022001102d22000d03052002101c0440410024042002102c220010142203101d1010200028020c413a46044020022001102d22010440200220014108102e21010c070b052002200110222201044020022001411a102e21010c070b0b200010"
    + "10200310100b0b0b0b2002101041000f0b200220004108102e21002002101020000f0b20021010200010102003101020010bd50101027f2000100f22022802004108462100200220012000101804402002101910102002101a047f410105200241908002"
    + "101b0b047f4101052002101c0b044002402002100f22032001102f22000440200041014104101f2003100f210103402001101510102001200020012802004108461018044020011019101020012000102f22000440200041034103101f0c020b0b0b2001"
    + "200041011021210020011010200310100c010b20031010410021000b20000440200041024100101f2002101020000f0b052002101020010f0b0b2002101041000b3e01017f2000100f2200101c047f4101052000101e0b047f4101052000280200411046"
    + "0b2102200020012002101804402000101020010f0b2000101041000bfe0101037f02402000100f2201280200410846044020014103103022000d01052001101c047f4101052001101e0b047f41010520012802004110460b044020011019101002402001"
    + "100f22034103103122000440200041014102101f2003100f210203402002101510102002101c047f4101052002101e0b047f41010520022802004110460b044020022000103122000440200041024101101f0c020b0b0b20022000410110212100200210"
    + "10200310100c010b20031010410021000b2000044020011015101020012802004108470d0320012000103022000440200041024100101f0c040b0b052001101041030f0b0b2001101041000f0b2001101020000b860101037f2000100f22032200230322"
    + "014704402000100f2100200110100b200024031011220110141010410024024100240120011015101002402001100f2202103222000440200210100c010b20021010410021000b41001016410010202000410171047f2001280208230341146b28021041"
    + "0176480541010b2100200110102003101020000bbd0101027f2000280204220241ffffffff0071210120002802004101710440410041b0b1a10241fa00410e1000000b20014101460440024002400240200041146a220141086b2802000e040202000201"
    + "0b200128020022010440200141b4b2a1024f0440200141146b10340b0b0c010b000b2002418080808078710440410041b0b1a10241fe0041121000000b23002000100c052001450440410041b0b1a10241880141101000000b2000200141016b20024180"
    + "8080807f71723602040b0b0be501040041dcb0a1020b3c280000000100000000000000010000002800000061006c006c006f0063006100740069006f006e00200074006f006f0020006c00610072006700650000419cb1a1020b321e0000000100000000"
    + "000000010000001e0000007e006c00690062002f00720074002f0070007500720065002e00740073000041dcb1a1020b321e0000000100000000000000010000001e0000007e006c00690062002f00720074002f0074006c00730066002e007400730000"
    + "4190b2a1020b24040000002000000000000000200000000000000020000000000000002000000000000000"
),
    { recognizer } = loadWASM(data, shared_memory);

const fns = [(e, sym) => sym[sym.length - 1],
(env, sym, pos) => (sym[0] + sym[1])/*0*/
    , (env, sym, pos) => (sym[0] + "")/*1*/
    , (env, sym, pos) => ((sym[0].push(sym[2]), sym[0]))/*2*/
    , (env, sym, pos) => ([sym[0]])/*3*/
    , (env, sym, pos) => (sym[0] ? { type: "call", call_id: sym[0], sub_stack: [sym[2]] } : sym[2])/*4*/
    , (env, sym, pos) => (null ? { type: "call", sub_stack: [sym[1]] } : sym[1])/*5*/
    , (env, sym, pos) => ({ type: "call", call_id: sym[0], sub_stack: sym[2] })/*6*/
    , (env, sym, pos) => (sym[0])/*7*/
    , (env, sym, pos) => (sym[0] == "<anonymous>" ? { type: "location", url: "anonymous", pos: sym[1] } : { type: "location", url: new env.URL(sym[0]), pos: sym[1] })/*8*/
    , (env, sym, pos) => (sym[0] == "<anonymous>" ? { type: "location", url: "anonymous" } : { type: "location", url: new env.URL(sym[0]) })/*9*/
    , (env, sym, pos) => ([parseInt(sym[1]), ...sym[2]])/*10*/
    , (env, sym, pos) => ([parseInt(sym[1])])/*11*/
    , (env, sym, pos) => (((sym[0] + sym[1])))/*12*/
    , (env, sym, pos) => (((sym[0])))/*13*/
    , (env, sym, pos) => (sym[0] + sym[1] + sym[2])/*14*/
    , (env, sym, pos) => (sym[0] + sym[1] + sym[2] + sym[3] + sym[4])/*15*/];

export default function (str, env = {}) {

    debug_stack.length = 0;
    const
        FAILED = recognizer(str), // call with pointers
        stack = [];

    let action_length = 0,
        error_message = "",
        review_stack = [];


    if (FAILED) {

        for (let i = debug_stack.length - 1, j = 0; i >= 0; i--) {
            if (!debug_stack[i].FAILED && j++ > 80)
                break;
            review_stack.push(debug_stack[i]);
        }

        review_stack.reverse();

        if (review_stack.length > 0)
            console.log({ review_stack });

        let error_off = 10000000000000;
        let error_set = false;


        const lexer = new Lexer(str);

        for (let i = 0; i < error_array.length; i++) {
            if (error_array[i] > 0) {
                if (!error_set) {
                    error_set = true;
                    error_off = 0;
                }
                error_off = Math.max(error_off, error_array[i]);
            }
        }

        if (error_off == 10000000000000)
            error_off = 0;

        while (lexer.off < error_off && !lexer.END) lexer.next();

        error_message = lexer.errorMessage(`Unexpected token[${lexer.tx}]`);


    } else {

        let offset = 0, pos = [];

        for (const action of action_array) {

            action_length++;

            if (action == 0) break;

            switch (action & 1) {
                case 0: //REDUCE;
                    {
                        const
                            DO_NOT_PUSH_TO_STACK = (action >> 1) & 1,
                            body = action >> 16,
                            len = ((action >> 2) & 0x3FFF);

                        const pos_a = pos[pos.length - len] || { off: 0, tl: 0 };
                        const pos_b = pos[pos.length - 1] || { off: 0, tl: 0 };
                        pos[stack.length - len] = { off: pos_a.off, tl: pos_b.off - pos_a.off + pos_b.tl };
                        const e = stack.slice(-len);
                        stack[stack.length - len] = fns[body](env, e, { off: pos_a.off, tl: pos_b.off - pos_a.off + pos_b.tl });

                        if (!DO_NOT_PUSH_TO_STACK) {
                            stack.length = stack.length - len + 1;
                            pos.length = pos.length - len + 1;
                        } else {
                            stack.length = stack.length - len;
                            pos.length = pos.length - len;
                        }

                    } break;

                case 1: { //SHIFT;
                    const
                        has_len = (action >>> 1) & 1,
                        has_skip = (action >>> 2) & 1,
                        len = action >>> (3 + (has_skip * 15)),
                        skip = has_skip * ((action >>> 3) & (~(has_len * 0xFFFF8000)));
                    offset += skip;
                    if (has_len) {
                        stack.push(str.slice(offset, offset + len));
                        pos.push({ off: offset, tl: len });
                        offset += len;
                    } else {
                        stack.push("");
                        pos.push({ off: offset, tl: 0 });
                    }
                } break;
            }
        }
    }

    console.log({ result: stack, FAILED: !!FAILED, action_length, error_message, review_stack });
    return { result: stack, FAILED: !!FAILED, action_length, error_message, review_stack };
}