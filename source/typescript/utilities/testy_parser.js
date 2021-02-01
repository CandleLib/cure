import {buildParserMemoryBuffer, loadWASM }  from "@candlefw/hydrocarbon";        
import Lexer from "@candlefw/wind"; 

const debug_stack = [];
const { shared_memory, action_array, error_array } = buildParserMemoryBuffer(false, 4194304, 163920);

const data = (str=>{const out = new Uint8Array(str.length>>1); for(let i = 0; i < str.length; i+=2) {out[i>>1] = parseInt(str.slice(i, i+2),16);} return out; })(
"0061736d01000000012c0860027f7f017f60017f017f60017f0060027f7f0060037f7f7f0060037f7f7f017f60000060047f7f7f7f00021c0203656e760561626f7274000703656e76066d656d6f72790201496403252403030406010004000001040305"
+"0001020001010102030504000100010200000001000102061d057f0141000b7f0141000b7f0141000b7f0141000b7f004190b2a1020b074807066d656d6f72790200055f5f6e65770009075f5f72656e6577000e085f5f72657461696e000f095f5f7265"
+"6c6561736500100b5f5f727474695f626173650304046d61696e00230a8826249b0201047f20012802002202410171450440410041f0b1a102419002410e1000000b2002417c71220241fcffffff034941002002410c4f1b450440410041f0b1a1024192"
+"02410e1000000b200241800249044020024104762102052002411f2002676b220341046b764110732102200341076b21030b2002411049410020034117491b450440410041f0b1a102419f02410e1000000b200128020821042001280204220504402005"
+"20043602080b20040440200420053602040b20012000200220034104746a4102746a2802604604402000200220034104746a4102746a20043602602004450440200020034102746a2204280204417e200277712101200420013602042001450440200020"
+"00280200417e200377713602000b0b0b0b8b0401077f2001450440410041f0b1a10241c801410e1000000b20012802002204410171450440410041f0b1a10241ca01410e1000000b200141046a2001280200417c716a2205280200220241017104402004"
+"417c7141046a2002417c716a220341fcffffff03490440027f200020051001200120032004410371722204360200200141046a2001280200417c716a22052802000b21020b0b20044102710440027f200141046b28020022032802002207410171450440"
+"410041f0b1a10241df0141101000000b2007417c7141046a2004417c716a220841fcffffff0349047f20002003100120032008200741037172220436020020030520010b0b21010b200520024102723602002004417c71220341fcffffff034941002003"
+"410c4f1b450440410041f0b1a10241ee01410e1000000b2003200141046a6a2005470440410041f0b1a10241ef01410e1000000b200541046b2001360200200341800249044020034104762103052003411f2003676b220441046b764110732103200441"
+"076b21060b2003411049410020064117491b450440410041f0b1a10241ff01410e1000000b2000200320064104746a4102746a2802602104200141003602042001200436020820040440200420013602040b2000200320064104746a4102746a20013602"
+"6020002000280200410120067472360200200020064102746a220020002802044101200374723602040bda0101027f200120024b0440410041f0b1a10241fc02410e1000000b200141136a41707141046b21012002417071210320002802a00c22020440"
+"2001200241046a490440410041f0b1a10241830341101000000b2002200141106b460440027f20022802002104200141106b0b21010b052001200041a40c6a490440410041f0b1a10241900341051000000b0b200320016b220241144904400f0b200120"
+"04410271200241086b22024101727236020020014100360204200141003602082002200141046a6a22024102360200200020023602a00c2000200110020b9f0101027f3f00220041c90048047f41c90020006b40004100480541000b0440000b41c0b2a1"
+"02410036020041e0bea1024100360200034020014117490440200141027441c0b2a1026a410036020441002100034020004110490440200020014104746a41027441c0b2a1026a4100360260200041016a21000c010b0b200141016a21010c010b0b41c0"
+"b2a10241e4bea1023f00411074100341c0b2a10224000b3300200041fcffffff034f044041f0b0a10241f0b1a10241cd03411e1000000b410c200041136a41707141046b2000410c4d1b0be00101017f20014180024904402001410476210105411f2001"
+"4101411b2001676b746a41016b2001200141feffffff01491b2201676b21022001200241046b764110732101200241076b21020b2001411049410020024117491b450440410041f0b1a10241cd02410e1000000b200020024102746a280204417f200174"
+"712201047f200020016820024104746a4102746a280260052000280200417f200241016a74712201047f200020016822014102746a2802042202450440410041f0b1a10241da0241121000000b200020026820014104746a4102746a2802600541000b0b"
+"0b8c0101027f20012802002103200241046a410f710440410041f0b1a10241e802410e1000000b2003417c7120026b220441104f0440200120022003410271723602002002200141046a6a2201200441046b410172360200200020011002052001200341"
+"7e71360200200141046a22002001280200417c716a20002001280200417c716a280200417d713602000b0bc60101027f20002001100522021006220145044041043f00220141107441046b20002802a00c477420024101411b2002676b7441016b6a2002"
+"200241feffffff01491b6a41ffff036a4180807c71411076210320012003200120034a1b40004100480440200340004100480440000b0b200020014110743f0041107410032000200210062201450440410041f0b1a10241f20341101000000b0b200220"
+"01280200417c714b0440410041f0b1a10241f403410e1000000b200020011001200020012002100720010b6001027f200041ecffffff034b044041f0b0a10241b0b1a102419302411e1000000b200041106a2102230045044010040b2300200210084104"
+"6a220341046b22024100360204200241003602082002200136020c20022000360210200341106a0b3a01017f200041046b21012000410f7145410020001b047f2001280200410171450541000b450440410041f0b1a10241b30441031000000b20010bb0"
+"0201027f02402002210420002001460d0020002001490440200141077120004107714604400340200041077104402004450d04200441016b21042000220241016a21002001220341016a2101200220032d00003a00000c010b0b0340200441084f044020"
+"002001290300370300200441086b2104200041086a2100200141086a21010c010b0b0b0340200404402000220241016a21002001220341016a2101200220032d00003a0000200441016b21040c010b0b0520014107712000410771460440034020002004"
+"6a41077104402004450d04200441016b220420006a200120046a2d00003a00000c010b0b0340200441084f0440200441086b220420006a200120046a2903003703000c010b0b0b034020040440200441016b220420006a200120046a2d00003a00000c01"
+"0b0b0b0b0b1500200120012802004101723602002000200110020b2f00200020021008220241046a200141046a2001280200417c71100b200141b4b2a1024f044020002001100c0b20020be00101077f200141ecffffff034b044041f0b0a10241b0b1a1"
+"0241a002411e1000000b200041106b2100230045044010040b200141106a2102200041b4b2a10249044023002000100a2002100d2100050240230021032000100a2100024020021005220520002802002206417c7122044d0d00200041046a2000280200"
+"417c716a2207280200220841017104402005200441046a2008417c716a22044d0440200320071001200020042006410371723602000c020b0b200320002002100d21000c010b20032000200510070b0b200041046a220041046b2001360210200041106a"
+"0b6701027f200041b4b2a1024b0440200041146b2201280204220241808080807f71200241016a41808080807f71470440410041b0b1a10241ed0041031000000b2001200241016a36020420012802004101710440410041b0b1a10241f000410e100000"
+"0b0b20000b1400200041b4b2a1024b0440200041146b10240b0b7101027f200041146b28021041017622022103200120024f0440417f0f0b41012003200141016a46200020014101746a2f010022024180f803714180b003471b044020020f0b20002001"
+"4101746a2f010222004180f803714180b80347044020020f0b20002002410a746a4180c880656a0ba801002000200028020820002802046a360208200041013602042000280208230341146b2802104101764e0440200041003602002000410036020420"
+"00417f36020c2000230341146b28021041017636020805200023032000280208101136020c2000027f02400240024002400240200028020c4101742f010041ff017141016b0e050102030304000b41100c040b41040c030b41010c020b41080c010b4102"
+"0b3602000b2000100f0b2e002000100f210003402000280200410846047f41010520002802004101460b04402000101210100c010b0b20000b4901017f2000100f21002303200028020841016a1011412446047f2303200028020810114124460541000b"
+"047f200041103602002000410236020441010541000b21012000101020010b1c01017f2301220141016a240120014102744180b0176a20003602000b8a0101037f2000100f220328020820032802106b22004103744101722104027f2000410047220204"
+"7f200041ff9f024b2200047f200005200141ff9f024b0b0541000b0440027f2003410010164101210441000b21020b20020b41027420014100474101747220012002410f6c41036a747220047210152003200328020820032802046a360210200310100b"
+"4d002000100f210020014101714504402000101041000f0b200204402000100f2102200141027104402002200228020410160b20021012101020021010200010100520001010410021010b20010b1c0020004102710440200141ffff0071410274200241"
+"10747210150b0b9f0101027f2000100f22002001200010141017044020001013101020002001027f20002802004102460440230341146b280210410176210320002802082102200041013602040340200241016a2202200348047f230320021011410174"
+"2f01004108764104710541000b04402000200028020441016a3602040c010b0b41010c010b41000b1017044020014102410b10182000101020010f0b0b2000101041000b6601027f20002802004104460440230341146b28021041017621022000280208"
+"2101200041013602040340200141016a2201200248047f2303200110114101742f01004108764106710541000b04402000200028020441016a3602040c010b0b41010f0b41000b3401017f2000100f2200101a047f41010520002802004110460b210220"
+"0020012002101704402000101020010f0b2000101041000b20002000100f21000340200028020041084604402000101210100c010b0b20000b2801017f23024194c0024f04400f0b2302220141016a240220014102744180b097026a20003602000bb101"
+"01027f2000100f210003402000101c101020001014047f410105200028020c4128460b047f410105200028020c41fb00460b04402000101020010f0b2000101a047f41010520002802004110460b044020002001101b2201044020014102410810180c02"
+"0b0b0b2000100f21022001410171450440027f2002100f21032001410271410020014101711b04402003100f2201280208101d200110100b2003101041000b21010b200210102000101020010b7201027f02402000100f2202100f22032001101b220004"
+"40200041014109101820032000101e2100200310100c010b20031010410021000b200004402002101c10102002200020022802004101461017044020004102410a10180520004101410a10180b2002101020000f0b2002101041000b9602000240027f20"
+"00100f2200101404402000200110192201044020014101410510180c030b0520002001200028020c4128461017044020001013101020002001102222010440200141014102101820001013101020002001200028020c4129461017044020014103410610"
+"180c050b0b0520002001200028020c41fb0046101704402000101310102000200110192201044020001013101020002001200028020c412c46101704402000101310102000200110192201044020001013101020002001200028020c41fd004610170440"
+"20014105410710180c080b0b0b0b0520002001101f220104402000101310102000200110202201044020014102410410180c060b0b0b0b0b2000101041000b0f0b2000101020010b13002000280208230341146b2802104101764e0b65002000100f2200"
+"2001102022010440200010131010200028020c412946047f410105200010210b04402000101020010f0520002001101f220104402000101310102000200110222201044020014103410310182000101020010f0b0b0b0b2000101041000bd80101037f20"
+"00100f22032200230322014704402000100f2100200110100b20002403411441031009100f2201410036020020014100360204200141003602082001410036020c200141003602102001410036020020014100360204200141003602082001410036020c"
+"20014100360210200110121010410024024100240120011013101002402001100f2202410310222200044020004101410210182000410141011018200210100c010b20021010410021000b410010154100101d2000410171047f20011021450541010b21"
+"00200110102003101020000bbd0101027f2000280204220241ffffffff0071210120002802004101710440410041b0b1a10241fa00410e1000000b20014101460440024002400240200041146a220141086b2802000e0402020002010b20012802002201"
+"0440200141b4b2a1024f0440200141146b10240b0b0c010b000b2002418080808078710440410041b0b1a10241fe0041121000000b23002000100c052001450440410041b0b1a10241880141101000000b2000200141016b200241808080807f71723602"
+"040b0b0be501040041dcb0a1020b3c280000000100000000000000010000002800000061006c006c006f0063006100740069006f006e00200074006f006f0020006c00610072006700650000419cb1a1020b321e0000000100000000000000010000001e"
+"0000007e006c00690062002f00720074002f0070007500720065002e00740073000041dcb1a1020b321e0000000100000000000000010000001e0000007e006c00690062002f00720074002f0074006c00730066002e0074007300004190b2a1020b2404"
+"0000002000000000000000200000000000000020000000000000002000000000000000"),
{ recognizer } = loadWASM(data, shared_memory);

const fns = [(e,sym)=>sym[sym.length-1], 
(env, sym, pos)=>( sym[0][0])/*0*/
,(env, sym, pos)=>( env.completeCaptures(sym[0],env.globals))/*1*/
,(env, sym, pos)=>( (sym[2].unshift(...sym[0],(sym[1].captures=2,sym[1])),sym[2]))/*2*/
,(env, sym, pos)=>( [sym[0],...sym[1]])/*3*/
,(env, sym, pos)=>( [sym[0]])/*4*/
,(env, sym, pos)=>( sym[1])/*5*/
,(env, sym, pos)=>( [{type:"range",start:sym[1],end:sym[3]}])/*6*/
,(env, sym, pos)=>( sym[0]+sym[1])/*7*/
,(env, sym, pos)=>( sym[0]+"")/*8*/
,(env, sym, pos)=>( {type:"op_ref",sym:sym[0],precedence:env.getPrecedence(sym[0],env.globals),captures:1})/*9*/
,(env, sym, pos)=>( parseInt(sym[1]))/*10*/]; 

export default function (str, env = {}) {
    
    debug_stack.length = 0;
        const 
            FAILED = recognizer(str), // call with pointers
            stack = [];
    
        let action_length = 0,
            error_message ="",
            review_stack = [];

    
        if (FAILED) {

            for(let i = debug_stack.length-1, j=0; i >= 0; i--){
                if(!debug_stack[i].FAILED && j++ > 80)
                    break;
                review_stack.push(debug_stack[i]);
            }

            review_stack.reverse();

            if(review_stack.length > 0)
                console.log({review_stack})
            
            let error_off = 10000000000000;
            let error_set = false;


            const lexer = new Lexer(str);

            for (let i = 0; i < error_array.length; i++) {
                if(error_array[i]>0 ){
                    if(!error_set){
                        error_set = true;
                        error_off = 0;
                    }
                    error_off = Math.max(error_off, error_array[i]);
                }
            }

            if(error_off == 10000000000000) 
                error_off = 0;

            while (lexer.off < error_off && !lexer.END) lexer.next();

            error_message = lexer.errorMessage(`Unexpected token[${ lexer.tx }]`);

    
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

                            const pos_a = pos[pos.length - len] || {off:0,tl:0};
                            const pos_b = pos[pos.length - 1 ] || {off:0,tl:0};
                            pos[stack.length - len] = { off: pos_a.off, tl: pos_b.off - pos_a.off  + pos_b.tl };
                            const e = stack.slice(-len)
                            stack[stack.length - len] = fns[body](env, e, { off: pos_a.off, tl: pos_b.off - pos_a.off  + pos_b.tl });

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
                        }else {
                            stack.push("");
                            pos.push({ off: offset, tl: 0 });
                        }
                    } break;
                }
            }
        }
        
        return { result: stack, FAILED: !!FAILED, action_length, error_message, review_stack };
    }