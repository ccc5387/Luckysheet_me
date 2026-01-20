import editor from './editor';
import formula from './formula';
import { jfrefreshgrid_adRC, jfrefreshgrid_deleteCell, jfrefreshgrid_rhcw } from './refresh';
import { datagridgrowth, getcellFormula } from './getdata';
import { setcellvalue } from './setdata';
import conditionformat from '../controllers/conditionformat';
import luckysheetFreezen from '../controllers/freezen';
import { selectHightlightShow } from '../controllers/select';
import { luckysheet_searcharray } from '../controllers/sheetSearch';
import {checkProtectionAuthorityNormal,checkProtectionNotEnable} from '../controllers/protection';
import { getSheetIndex } from '../methods/get';
import Store from '../store';
import {updateCalcChain, updateCalcChainSheetIndex} from "./api";

/**
 * 增加行列
 * @param {string} type 行或列 ['row', 'column'] 之一
 * @param {number} index 插入的位置 index
 * @param {number} value 插入 多少 行（列）
 * @param {string} direction 哪个方向插入 ['lefttop','rightbottom'] 之一
 * @param {string | number} sheetIndex 操作的 sheet 的 index 属性
 * @returns
 */
function luckysheetextendtable(type, index, value, direction, sheetIndex) {

    sheetIndex = sheetIndex || Store.currentSheetIndex;
    Store.luckysheetfile[sheetIndex].calcChain =[];//清空公式链 jxh start 增加行或列后,有些公式的位置没有随之变动

    if(type=='row' && !checkProtectionAuthorityNormal(sheetIndex, "insertRows")){
        return;
    }
    else if(type=='column' && !checkProtectionAuthorityNormal(sheetIndex, "insertColumns")){
        return;
    }

    let curOrder = getSheetIndex(sheetIndex);
    let file = Store.luckysheetfile[curOrder];
    let d = $.extend(true, [], file.data);

    value = Math.floor(value);
    let cfg = $.extend(true, {}, file.config);

    //合并单元格配置变动
    if(cfg["merge"] == null){
        cfg["merge"] = {};
    }

    let merge_new = {};
    for(let m in cfg["merge"]){
        let mc = cfg["merge"][m];

        let r = mc.r,
            c = mc.c,
            rs = mc.rs,
            cs = mc.cs;

        if(type == "row"){
            if(index < r){
                merge_new[(r + value) + "_" + c] = { "r": r + value, "c": c, "rs": rs, "cs": cs };
            }
            // *这里要判断一下rs是否等于1,因为如果这个合并单元格的行数只有一行时r = r+ rs-1,这种情况不应该进行单元格的加高
            else if (index == r && rs != 1) {
                if(direction == "lefttop"){
                    merge_new[(r + value) + "_" + c] = { "r": r + value, "c": c, "rs": rs, "cs": cs };
                }
                else{
                    merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs + value, "cs": cs };
                }
            }
            else if(index < r + rs - 1){
                merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs + value, "cs": cs };
            }
            else if(index == r + rs - 1){
                if(direction == "lefttop"){
                    if(rs == 1){
                        merge_new[(r + value) + "_" + c] = { "r": r + value, "c": c, "rs": rs, "cs": cs };
                    } else {
                        merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs + value, "cs": cs };
                    }
                }
                else{
                    merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs, "cs": cs };
                }
            }
            else{
                merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs, "cs": cs };
            }
        }
        else if(type == "column"){
            if(index < c){
                merge_new[r + "_" + (c + value)] = { "r": r, "c": c + value, "rs": rs, "cs": cs };
            }
            else if(index == c && cs != 1){
                if(direction == "lefttop"){
                    merge_new[r + "_" + (c + value)] = { "r": r, "c": c + value, "rs": rs, "cs": cs };
                }
                else{
                    merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs, "cs": cs + value };
                }
            }
            else if(index < c + cs - 1){
                merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs, "cs": cs + value };
            }
            else if(index == c + cs - 1){
                if(direction == "lefttop"){
                    // *这是要判断一下这个合并单元格的列宽是否=1,如果cs等于1的情况下,向左插入列，这个合并单元格会右移
                    if(cs == 1){
                        merge_new[r + "_" + (c + value)] = { "r": r, "c": c + value, "rs": rs, "cs": cs };
                    } else {
                        merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs, "cs": cs + value };
                    }
                }
                else{
                    merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs, "cs": cs };
                }
            }
            else{
                merge_new[r + "_" + c] = { "r": r, "c": c, "rs": rs, "cs": cs };
            }
        }
    }
    cfg["merge"] = merge_new;

    // Add the scrollbar adjustment
    const targetTop = Math.max(0, Math.min(document.getElementById('luckysheet-cell-main').scrollHeight - document.getElementById('luckysheet-cell-main').clientHeight, index * value));
    requestAnimationFrame(() => {
        document.getElementById('luckysheet-cell-main').scrollTop = targetTop;
    });

    // //公式配置变动
    // let calcChain = file.calcChain;
    // let newCalcChain = [];
    // if(calcChain != null && calcChain.length > 0){
    //     for(let i = 0; i < calcChain.length; i++){... (file continues)