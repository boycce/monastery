export declare namespace required {
    const validateUndefined: boolean;
    const validateNull: boolean;
    const validateEmptyString: boolean;
    const message: string;
    function fn(x: any): boolean;
}
export declare namespace isBoolean {
    const validateEmptyString_1: boolean;
    export { validateEmptyString_1 as validateEmptyString };
    const message_1: string;
    export { message_1 as message };
    export function tryParse(x: any): any;
    export function fn_1(x: any): boolean;
    export { fn_1 as fn };
}
export declare namespace isArray {
    const validateEmptyString_2: boolean;
    export { validateEmptyString_2 as validateEmptyString };
    const message_2: string;
    export { message_2 as message };
    export function tryParse_1(x: any): any;
    export { tryParse_1 as tryParse };
    export function fn_2(x: any): boolean;
    export { fn_2 as fn };
}
export declare namespace isDate {
    const validateEmptyString_3: boolean;
    export { validateEmptyString_3 as validateEmptyString };
    const message_3: string;
    export { message_3 as message };
    export function tryParse_2(x: any): any;
    export { tryParse_2 as tryParse };
    export function fn_3(x: any): boolean;
    export { fn_3 as fn };
}
export declare namespace isImageObject {
    const validateEmptyString_4: boolean;
    export { validateEmptyString_4 as validateEmptyString };
    const message_4: string;
    export { message_4 as message };
    export const messageLong: string;
    export function tryParse_3(x: any): any;
    export { tryParse_3 as tryParse };
    export function fn_4(x: any): boolean;
    export { fn_4 as fn };
}
export declare namespace isInteger {
    const validateEmptyString_5: boolean;
    export { validateEmptyString_5 as validateEmptyString };
    const message_5: string;
    export { message_5 as message };
    export function tryParse_4(x: any): any;
    export { tryParse_4 as tryParse };
    export function fn_5(x: any): boolean;
    export { fn_5 as fn };
}
export declare namespace isNumber {
    const validateEmptyString_6: boolean;
    export { validateEmptyString_6 as validateEmptyString };
    const message_6: string;
    export { message_6 as message };
    export function tryParse_5(x: any): any;
    export { tryParse_5 as tryParse };
    export function fn_6(x: any): boolean;
    export { fn_6 as fn };
}
export declare namespace isObject {
    const validateEmptyString_7: boolean;
    export { validateEmptyString_7 as validateEmptyString };
    const message_7: string;
    export { message_7 as message };
    export function tryParse_6(x: any): any;
    export { tryParse_6 as tryParse };
    export function fn_7(x: any): boolean;
    export { fn_7 as fn };
}
export declare namespace isString {
    const validateEmptyString_8: boolean;
    export { validateEmptyString_8 as validateEmptyString };
    const message_8: string;
    export { message_8 as message };
    export function tryParse_7(x: any): any;
    export { tryParse_7 as tryParse };
    export function fn_8(x: any): boolean;
    export { fn_8 as fn };
}
export declare namespace isAny {
    const validateEmptyString_9: boolean;
    export { validateEmptyString_9 as validateEmptyString };
    const message_9: string;
    export { message_9 as message };
    export function fn_9(x: any): boolean;
    export { fn_9 as fn };
}
export declare namespace isId {
    const validateEmptyString_10: boolean;
    export { validateEmptyString_10 as validateEmptyString };
    const message_10: string;
    export { message_10 as message };
    export function tryParse_8(x: any): any;
    export { tryParse_8 as tryParse };
    export function fn_10(x: any): boolean;
    export { fn_10 as fn };
}
export declare namespace max {
    export function message_11(x: any, arg: any): string;
    export { message_11 as message };
    export function fn_11(x: any, arg: any): boolean;
    export { fn_11 as fn };
}
export declare namespace min {
    export function message_12(x: any, arg: any): string;
    export { message_12 as message };
    export function fn_12(x: any, arg: any): boolean;
    export { fn_12 as fn };
}
export declare namespace _enum {
    export function message_13(x: any, arg: any): string;
    export { message_13 as message };
    export function fn_13(x: any, arg: any): boolean;
    export { fn_13 as fn };
}
export { _enum as enum };
export declare namespace isAfter {
    export function message_14(x: any, arg: any): string;
    export { message_14 as message };
    export function fn_14(x: any, arg: any): any;
    export { fn_14 as fn };
}
export declare namespace isBefore {
    export function message_15(x: any, arg: any): string;
    export { message_15 as message };
    export function fn_15(x: any, arg: any): any;
    export { fn_15 as fn };
}
export declare namespace isCreditCard {
    const message_16: string;
    export { message_16 as message };
    export function fn_16(x: any, arg: any): any;
    export { fn_16 as fn };
}
export declare namespace isEmail {
    const message_17: string;
    export { message_17 as message };
    export function fn_17(x: any, arg: any): any;
    export { fn_17 as fn };
}
export declare namespace isHexColor {
    const message_18: string;
    export { message_18 as message };
    export function fn_18(x: any, arg: any): any;
    export { fn_18 as fn };
}
export declare namespace isIn {
    export function message_19(x: any, arg: any): string;
    export { message_19 as message };
    export function fn_19(x: any, arg: any): any;
    export { fn_19 as fn };
}
export declare namespace isIP {
    const message_20: string;
    export { message_20 as message };
    export function fn_20(x: any, arg: any): any;
    export { fn_20 as fn };
}
export declare namespace isNotEmptyString {
    const validateEmptyString_11: boolean;
    export { validateEmptyString_11 as validateEmptyString };
    const message_21: string;
    export { message_21 as message };
    export function fn_21(x: any): boolean;
    export { fn_21 as fn };
}
export declare namespace isNotIn {
    export function message_22(x: any, arg: any): string;
    export { message_22 as message };
    export function fn_22(x: any, arg: any): boolean;
    export { fn_22 as fn };
}
export declare namespace isURL {
    const message_23: string;
    export { message_23 as message };
    export function fn_23(x: any, arg: any): any;
    export { fn_23 as fn };
}
export declare namespace isUUID {
    const message_24: string;
    export { message_24 as message };
    export function fn_24(x: any, arg: any): any;
    export { fn_24 as fn };
}
export declare namespace minLength {
    export function message_25(x: any, arg: any): string;
    export { message_25 as message };
    export function fn_25(x: any, arg: any): any;
    export { fn_25 as fn };
}
export declare namespace maxLength {
    export function message_26(x: any, arg: any): string;
    export { message_26 as message };
    export function fn_26(x: any, arg: any): any;
    export { fn_26 as fn };
}
export declare namespace regex {
    export function message_27(x: any, arg: any): string;
    export { message_27 as message };
    export function fn_27(x: any, arg: any): any;
    export { fn_27 as fn };
}
//# sourceMappingURL=rules.d.ts.map