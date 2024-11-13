import fs from "node:fs";
import path from "node:path";
import ProgressBar from "progress";
import { config } from "../../config";
import { IProcessListItem, ISDKInfo, UniappSdkEnum } from "../../type";

import { ProcessAndroid } from "./android";

import {
  unzipFile,
  calculateFileMD5,
  moveContentsUp,
  isDirectoryEmptySync,
  macos_files,
} from "../_common";

const temp_sdk_path = path.resolve(config.uniapp_sdk_path, "temp");

// 处理temp目录 | 解压到sdk目录，`版本号/Android` 或 `版本号/IOS`
class ProcessSDK {
  private temp_path: string;
  /** 跳过检索的文件(夹)名称 ｜ 目前考虑的是macos上一些会自动创建的文件、目录 */
  private skips: string[];

  /** sdk 压缩包文件标识 */
  static SDK_ZIP_IDENTITY = "-SDK@";
  static SDK_ZIP_FILE = "zip";

  constructor(temp_path = temp_sdk_path, skips = macos_files) {
    this.temp_path = temp_path;
    this.skips = skips;
  }

  async init() {
    const files = fs.readdirSync(this.temp_path);

    const process_list: IProcessListItem[] = [];

    for (const file_name of files) {
      const file_path = path.join(this.temp_path, file_name);

      if (
        !this.skips.includes(file_name) &&
        file_name.includes(ProcessSDK.SDK_ZIP_IDENTITY) &&
        file_name
          .toLowerCase()
          .endsWith(`.${ProcessSDK.SDK_ZIP_FILE.toLowerCase()}`)
      ) {
        const [platform, version] = file_name
          .substring(0, file_name.length - `.${ProcessSDK.SDK_ZIP_FILE}`.length)
          .split(ProcessSDK.SDK_ZIP_IDENTITY);

        const [is_exist, target_path] = this.check_version_dir({
          platform,
          version,
        });

        if (target_path && !is_exist) {
          await calculateFileMD5(file_path).then(async (md5) => {
            await unzipFile(file_path, target_path, this.skips, "always");
            process_list.push({ platform, version, md5, file_name, file_path });
          });
        }
      }
    }
  }

  /**
   *
   * @param sdk_info
   * @param create
   * @returns [是否存在, sdk路径] 第一个参数只表示检索之时是否存在，第二个参数表示sdk路径｜空文件夹算不存在
   */
  private check_version_dir(sdk_info: ISDKInfo): [boolean, string | undefined] {
    const sdk_path = path.join(
      config.uniapp_sdk_path,
      sdk_info.platform,
      sdk_info.version
    );

    if (
      !fs.existsSync(sdk_path) ||
      isDirectoryEmptySync(sdk_path, this.skips)
    ) {
      fs.mkdirSync(sdk_path, { recursive: true });
      return [false, sdk_path];
    } else {
      return [true, sdk_path];
    }
  }

  async process_sdk() {
    // 检索 uniapp_sdk_path 下的平台目录，
    // 分别处理 platform/version/SDK 目录， 提升到 platform/version
    // 删除其余部分

    const platforms = fs
      .readdirSync(config.uniapp_sdk_path)
      .filter((platform) => {
        return (
          !this.skips.includes(platform) &&
          [
            UniappSdkEnum.Android.toLowerCase(),
            UniappSdkEnum.IOS.toLowerCase(),
          ].includes(platform.toLowerCase())
        );
      });

    for (const platform of platforms) {
      const platform_path = path.join(config.uniapp_sdk_path, platform);

      if (fs.lstatSync(platform_path).isDirectory()) {
        const versions = fs.readdirSync(platform_path).filter((version) => {
          return !this.skips.includes(version);
        });

        for (const version of versions) {
          const version_path = path.join(platform_path, version);

          if (fs.lstatSync(version_path).isDirectory()) {
            const files = fs.readdirSync(version_path);

            // 有 libs 文件夹，说明是处理过的目录 ｜ 不再处理
            if (files.map(item => item.toLowerCase()).includes("libs")) {
              continue;
            }

            for (const file_name of files) {
              if (file_name !== "SDK") {
                // 删除其余部分 不论文件夹还是文件
                const file_path = path.join(version_path, file_name);
                if (fs.lstatSync(file_path).isDirectory()) {
                  fs.rmSync(file_path, { recursive: true });
                } else {
                  fs.unlinkSync(file_path);
                }
              }
            }
            // 提升到 platform/version
            moveContentsUp(version_path);
          }
        }
      }
    }
  }
}

(async () => {
  const processer = new ProcessSDK();
  await processer.init();
  await processer.process_sdk();

  const app_dist_list = fs.readdirSync(config.app_dist_path);
  const result = {};
  for (const app_dist of app_dist_list) {
    const app_dist_path = path.join(config.app_dist_path, app_dist);
    if (fs.lstatSync(app_dist_path).isDirectory()) {
      const android = new ProcessAndroid(app_dist_path);
      result[app_dist] = android;
    } else if (app_dist.endsWith(".zip")) {
      const temp_name = app_dist.substring(0, app_dist.length - ".zip".length);
      const unzip_target = path.join(config.app_dist_path, temp_name);
      await unzipFile(app_dist_path, unzip_target, macos_files, "always");
      // 删除原文件
      fs.unlinkSync(app_dist_path);

      const android = new ProcessAndroid(unzip_target);
      result[temp_name] = android;
    }
  }

  console.log(result);
})();
