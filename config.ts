import path from 'node:path';
import { UniappSdkEnum } from './type';

const project_root = path.resolve(__dirname, '.');
const uniapp_sdk_path = path.resolve(project_root, 'sdk');

const app_dist_path = path.resolve(project_root, 'app-dist');

export const config = {
    /** 项目根目录 */
    project_root,

    /** uniapp 离线sdk文件夹 */
    uniapp_sdk_path,
    /** app-dist */
    app_dist_path,
}
