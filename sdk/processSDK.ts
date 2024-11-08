import fs from "node:fs";
import path from "node:path";
import {
  unzipFile,
  calculateFileMD5,
  isDirectoryEmptySync,
  macos_files,
} from "./_common";
import { config } from "../config";
import { IProcessListItem, ISDKInfo } from "../type";
import ProgressBar from "progress";

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

    this.init();
  }

  private async init() {
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

  private async process_sdk(
    file_path: string,
    target_path: string,
    md5: string
  ) {
    const bar = new ProgressBar(`[:bar] :current/:total :percent :etas`, {
      total: 100,
    });

    await unzipFile(
      file_path,
      target_path,
      this.skips,
      "always",
      (progress) => {
        bar.update(progress);
      }
    );
  }
}

const processer = new ProcessSDK();
// console.log(processer);
