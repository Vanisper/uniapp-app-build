/** 离线sdk类型 */
export enum UniappSdkEnum {
    Android = 'android',
    IOS = 'ios',
}

export type UniappSdkType = UniappSdkEnum | string;

/** sdk 信息 */
export interface ISDKInfo {
    /** sdk版本 */
    version: string;
    platform: UniappSdkType;
}

export interface IProcessListItem {
    platform: UniappSdkType;
    version: string;
    md5: string;
    file_name: string;
    file_path: string;
}
